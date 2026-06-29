import { create } from 'zustand'
import { createAssetWithMetadata, detectAssetType, validateMediaFile } from '../assets/assets.engine'
import { downloadRenderResult, renderProjectInBrowser } from '../render/browser-renderer'
import { renderProjectWithFfmpegWorker } from '../render/ffmpeg-renderer'
import { buildFfmpegPlan, exportPresets } from '../render/render.engine'
import type { ExportSettings } from '../render/render.types'
import { createClipFromAsset, moveClip, splitClipAt } from '../timeline/timeline.engine'
import { mockPacks } from '../../data/mockPacks'
import { fetchPackCatalog, resolveInstallablePack } from '../packs/pack.catalog'
import { validatePackManifest } from '../packs/manifest.validator'
import { createProject, touchProject } from './project.engine'
import { deleteInstalledPack, deleteProject, getProject, listInstalledPacks, listProjectAssets, listProjects, saveInstalledPack, saveInstalledPackAsset, saveProject, saveProjectAsset, saveProjectVersion } from './project.persistence'
import type { EffectPack } from '../packs/packs.types'
import type { EditorAsset, ProjectJson, ProjectRecord, TextStyle, TimelineClip, VideoFormat } from './project.types'
import { downloadProjectBackup, readProjectBackup } from './project.backup'

type SaveStatus = 'salvo' | 'alterado' | 'salvando' | 'erro'
type AppView = 'home' | 'new-project' | 'editor' | 'export' | 'packs' | 'settings'
export type EditorPanel = 'media' | 'text' | 'templates' | 'effects' | 'transitions' | 'audio' | 'stickers' | 'captions' | 'packs' | 'settings'

interface EditorState {
  view: AppView
  activePanel: EditorPanel
  projects: ProjectRecord[]
  currentProject?: ProjectJson
  selectedClipId?: string
  currentTime: number
  isPlaying: boolean
  saveStatus: SaveStatus
  installedPackIds: string[]
  installedPackItemCount: number
  availablePacks: EffectPack[]
  packCatalogStatus: string
  lastError?: string
  renderProgress: number
  renderStatus: string
  isRendering: boolean
  exportSettings: ExportSettings
  goTo: (view: AppView) => void
  setActivePanel: (panel: EditorPanel) => void
  refreshProjects: () => Promise<void>
  refreshInstalledPacks: () => Promise<void>
  refreshOnlinePacks: () => Promise<void>
  createNewProject: (input: { title: string; format: VideoFormat; width?: number; height?: number; fps?: number }) => Promise<void>
  openProject: (id: string) => Promise<void>
  duplicateProject: (id: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  saveCurrentProject: (important?: boolean) => Promise<void>
  importFiles: (files: FileList | File[]) => Promise<void>
  importProjectBackup: (file: File) => Promise<void>
  exportProjectBackup: () => void
  addTextClip: () => void
  addCaption: () => void
  addStickerClip: (label: string) => void
  applyEffectToSelected: (effect: { id: string; type: string; name: string; params?: Record<string, number | string | boolean> }) => void
  addTransitionPreset: (transition: { id: string; name: string; duration: number }) => void
  selectClip: (id?: string) => void
  updateClip: (id: string, patch: Partial<TimelineClip>) => void
  splitSelectedClip: () => void
  deleteSelectedClip: () => void
  duplicateSelectedClip: () => void
  setTimelineZoom: (zoom: number) => void
  exportCaptionsSrt: () => void
  importCaptionsSrt: (file: File) => Promise<void>
  setCurrentTime: (time: number) => void
  togglePlayback: () => void
  installPack: (id: string) => Promise<void>
  removePack: (id: string) => Promise<void>
  updateExportSettings: (patch: Partial<ExportSettings>) => void
  cancelRender: () => void
  renderCurrentProject: () => Promise<void>
  getExportPlan: () => ReturnType<typeof buildFfmpegPlan> | undefined
}

const defaultExportSettings: ExportSettings = {
  resolution: '1080p',
  fps: 30,
  quality: 'alta',
  bitrate: 'auto',
  improveQuality: false,
  sharpen: false,
  denoise: false,
  improveContrast: false,
  improveSaturation: false,
}

let activeRenderCancelToken: { cancelled: boolean } | undefined

const defaultTextStyle: TextStyle = {
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: 72,
  fontWeight: '700',
  fontStyle: 'normal',
  color: '#FFFFFF',
  backgroundColor: 'transparent',
  strokeColor: '#000000',
  strokeWidth: 0,
  shadow: { enabled: true, color: '#000000', blur: 12, offsetX: 0, offsetY: 5 },
  align: 'center',
  opacity: 1,
}

function toProjectRecord(project: ProjectJson): ProjectRecord {
  return {
    id: project.id,
    title: project.title,
    format: project.format,
    width: project.width,
    height: project.height,
    duration: project.duration,
    fps: project.fps,
    project_json: project,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  }
}

function mutateProject(project: ProjectJson | undefined, mutator: (project: ProjectJson) => ProjectJson) {
  if (!project) return project
  return touchProject(mutator(project))
}

function formatSrtTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const secs = Math.floor(safeSeconds % 60)
  const millis = Math.round((safeSeconds % 1) * 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`
}

function parseSrt(input: string) {
  const timeToSeconds = (value: string) => {
    const match = value.match(/(\d+):(\d+):(\d+),(\d+)/)
    if (!match) return 0
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000
  }
  return input
    .replace(/\r/g, '')
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split('\n').filter(Boolean)
      const timeLine = lines.find((line) => line.includes('-->'))
      if (!timeLine) return undefined
      const [startText, endText] = timeLine.split('-->').map((item) => item.trim())
      const start = timeToSeconds(startText)
      const end = timeToSeconds(endText)
      const text = lines.slice(lines.indexOf(timeLine) + 1).join('\n').trim()
      if (!text || end <= start) return undefined
      return { start, duration: end - start, text }
    })
    .filter((item): item is { start: number; duration: number; text: string } => Boolean(item))
}

async function hydrateProjectAssets(project: ProjectJson): Promise<ProjectJson> {
  const persistedAssets = await listProjectAssets(project.id)
  if (!persistedAssets.length) return project
  const assets = project.assets.map((asset) => {
    const stored = persistedAssets.find((item) => item.asset_id === asset.id)
    if (!stored) return asset
    return {
      ...asset,
      src: URL.createObjectURL(stored.blob),
    }
  })
  return { ...project, assets }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  view: 'home',
  activePanel: 'media',
  projects: [],
  currentTime: 0,
  isPlaying: false,
  saveStatus: 'salvo',
  installedPackIds: [],
  installedPackItemCount: 0,
  availablePacks: mockPacks,
  packCatalogStatus: 'Catalogo local carregado.',
  renderProgress: 0,
  renderStatus: 'Aguardando',
  isRendering: false,
  exportSettings: defaultExportSettings,

  goTo: (view) => set({ view }),
  setActivePanel: (panel) => set({ activePanel: panel }),

  refreshProjects: async () => {
    set({ projects: await listProjects() })
  },

  refreshInstalledPacks: async () => {
    const packs = await listInstalledPacks()
    set({
      installedPackIds: packs.map((pack) => pack.id),
      installedPackItemCount: packs.reduce((total, pack) => total + pack.manifest.items.length, 0),
    })
  },

  refreshOnlinePacks: async () => {
    set({ packCatalogStatus: 'Atualizando catalogo do GitHub...' })
    try {
      const catalog = await fetchPackCatalog()
      const merged = mergePacks(mockPacks, catalog.packs)
      set({ availablePacks: merged, packCatalogStatus: `${catalog.packs.length} pacote(s) encontrados no GitHub.`, lastError: undefined })
    } catch (error) {
      set({
        availablePacks: mockPacks,
        packCatalogStatus: 'Usando catalogo local. Nao foi possivel consultar o GitHub.',
        lastError: error instanceof Error ? error.message : 'Nao foi possivel atualizar o catalogo.',
      })
    }
  },

  createNewProject: async (input) => {
    const project = createProject(input)
    await saveProject(toProjectRecord(project))
    set({ currentProject: project, currentTime: 0, selectedClipId: undefined, view: 'editor', saveStatus: 'salvo' })
    await get().refreshProjects()
  },

  openProject: async (id) => {
    try {
      const record = await getProject(id)
      if (!record) {
        set({ lastError: 'Projeto nao encontrado.' })
        return
      }
      const hydratedProject = await hydrateProjectAssets(record.project_json)
      set({ currentProject: hydratedProject, selectedClipId: undefined, currentTime: 0, view: 'editor', saveStatus: 'salvo', lastError: undefined })
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Nao foi possivel abrir o projeto.' })
    }
  },

  duplicateProject: async (id) => {
    const record = await getProject(id)
    if (!record) return
    const createdAt = new Date().toISOString()
    const copy: ProjectJson = { ...record.project_json, id: crypto.randomUUID(), title: `${record.title} copia`, createdAt, updatedAt: createdAt }
    await saveProject(toProjectRecord(copy))
    await get().refreshProjects()
  },

  removeProject: async (id) => {
    await deleteProject(id)
    set((state) => ({ currentProject: state.currentProject?.id === id ? undefined : state.currentProject, view: state.currentProject?.id === id ? 'home' : state.view }))
    await get().refreshProjects()
  },

  saveCurrentProject: async (important = false) => {
    const project = get().currentProject
    if (!project) return
    set({ saveStatus: 'salvando' })
    const savedProject = touchProject(project)
    await saveProject(toProjectRecord(savedProject))
    if (important) {
      await saveProjectVersion({
        id: crypto.randomUUID(),
        project_id: savedProject.id,
        version_number: Date.now(),
        project_json: savedProject,
        created_at: new Date().toISOString(),
      })
    }
    set({ currentProject: savedProject, saveStatus: 'salvo' })
    await get().refreshProjects()
  },

  importFiles: async (files) => {
    const project = get().currentProject
    if (!project) return
    const importedAssets: EditorAsset[] = []
    const newClips: TimelineClip[] = []

    for (const file of Array.from(files)) {
      const validation = validateMediaFile(file)
      if (!validation.valid) {
        set({ lastError: validation.error })
        continue
      }
      const type = detectAssetType(file)
      if (!type) continue
      const objectUrl = URL.createObjectURL(file)
      const asset = await createAssetWithMetadata(file, type, objectUrl)
      await saveProjectAsset({
        id: crypto.randomUUID(),
        project_id: project.id,
        asset_id: asset.id,
        type,
        name: file.name,
        mime_type: file.type,
        size: file.size,
        blob: file,
        created_at: asset.createdAt,
      })
      importedAssets.push(asset)
      const targetTrack = type === 'audio' ? 'track_audio_1' : type === 'image' ? 'track_overlay_1' : 'track_video_1'
      const start = project.clips.filter((clip) => clip.trackId === targetTrack).reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0)
      newClips.push(createClipFromAsset(asset, targetTrack, start))
    }

    if (!importedAssets.length) return
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (current) => ({ ...current, assets: [...current.assets, ...importedAssets], clips: [...current.clips, ...newClips] })),
      selectedClipId: newClips[0]?.id,
      saveStatus: 'alterado',
    }))
  },

  importProjectBackup: async (file) => {
    try {
      const project = await readProjectBackup(file)
      const createdAt = new Date().toISOString()
      const importedProject: ProjectJson = {
        ...project,
        id: crypto.randomUUID(),
        title: `${project.title} importado`,
        createdAt,
        updatedAt: createdAt,
        assets: project.assets.map((asset) => ({ ...asset, src: '' })),
      }
      await saveProject(toProjectRecord(importedProject))
      set({ currentProject: importedProject, currentTime: 0, selectedClipId: undefined, view: 'editor', saveStatus: 'salvo' })
      await get().refreshProjects()
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Nao foi possivel importar o projeto.' })
    }
  },

  exportProjectBackup: () => {
    const project = get().currentProject
    if (!project) return
    downloadProjectBackup(project)
  },

  addTextClip: () => {
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (project) => ({
        ...project,
        clips: [
          ...project.clips,
          {
            id: crypto.randomUUID(),
            type: 'text',
            trackId: 'track_text_1',
            start: state.currentTime,
            duration: 5,
            trimStart: 0,
            trimEnd: 5,
            position: { x: project.width / 2, y: project.height / 2 },
            size: { width: project.width * 0.75, height: 160 },
            scale: 1,
            rotation: 0,
            opacity: 1,
            volume: 1,
            blendMode: 'normal',
            effects: [],
            animations: [],
            keyframes: [],
            metadata: {},
            text: 'Texto do video',
            style: defaultTextStyle,
          },
        ],
      })),
      saveStatus: 'alterado',
    }))
  },

  addCaption: () => {
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (project) => ({
        ...project,
        captions: [
          ...project.captions,
          {
            id: crypto.randomUUID(),
            type: 'caption',
            trackId: 'track_caption_1',
            start: state.currentTime,
            duration: 3,
            text: 'Legenda manual',
            style: { fontFamily: 'Arial', fontSize: 42, fontWeight: '700', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.6)', align: 'center', position: 'bottom' },
          },
        ],
      })),
      saveStatus: 'alterado',
    }))
  },

  addStickerClip: (label) => {
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (project) => ({
        ...project,
        clips: [
          ...project.clips,
          {
            id: crypto.randomUUID(),
            type: 'text',
            trackId: 'track_overlay_1',
            start: state.currentTime,
            duration: 4,
            trimStart: 0,
            trimEnd: 4,
            position: { x: project.width / 2, y: project.height / 2 },
            size: { width: project.width * 0.35, height: 160 },
            scale: 1,
            rotation: 0,
            opacity: 1,
            volume: 1,
            blendMode: 'normal',
            effects: [],
            animations: [],
            keyframes: [],
            metadata: { sticker: true },
            text: label,
            style: { ...defaultTextStyle, fontSize: 92, color: '#14B8A6' },
          },
        ],
      })),
      saveStatus: 'alterado',
    }))
  },

  selectClip: (id) => set({ selectedClipId: id }),
  updateClip: (id, patch) => set((state) => ({
    currentProject: mutateProject(state.currentProject, (project) => ({ ...project, clips: project.clips.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)) })),
    saveStatus: 'alterado',
  })),

  applyEffectToSelected: (effect) => {
    const project = get().currentProject
    const targetClipId = get().selectedClipId || project?.clips.find((clip) => clip.type !== 'audio')?.id
    if (!targetClipId) {
      set({ lastError: 'Adicione um clipe de video, imagem ou texto para aplicar o efeito.' })
      return
    }
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (project) => ({
        ...project,
        clips: project.clips.map((clip) => (clip.id === targetClipId ? {
          ...clip,
          effects: [
            ...clip.effects.filter((item) => item.id !== effect.id),
            { id: effect.id, type: effect.type, name: effect.name, enabled: true, params: effect.params || {} },
          ],
        } : clip)),
      })),
      selectedClipId: targetClipId,
      lastError: undefined,
      saveStatus: 'alterado',
    }))
  },

  addTransitionPreset: (transition) => {
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (project) => {
        const visualClips = project.clips
          .filter((clip) => clip.type !== 'audio')
          .sort((a, b) => a.start - b.start)
        if (visualClips.length < 2) {
          return {
            ...project,
            transitions: [
              ...project.transitions,
              {
                id: crypto.randomUUID(),
                type: transition.id,
                fromClipId: visualClips[0]?.id || 'clip_atual',
                toClipId: visualClips[1]?.id || 'proximo_clip',
                start: Math.max(0, state.currentTime),
                duration: transition.duration,
                params: { pendingSecondClip: true },
              },
            ],
          }
        }
        const fromClip = visualClips[0]
        const toClip = visualClips[1]
        return {
          ...project,
          transitions: [
            ...project.transitions,
            {
              id: crypto.randomUUID(),
              type: transition.id,
              fromClipId: fromClip.id,
              toClipId: toClip.id,
              start: Math.max(fromClip.start, toClip.start - transition.duration),
              duration: transition.duration,
              params: {},
            },
          ],
        }
      }),
      saveStatus: 'alterado',
    }))
  },

  splitSelectedClip: () => {
    const { selectedClipId, currentTime } = get()
    if (!selectedClipId) return
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (project) => ({ ...project, clips: project.clips.flatMap((clip) => (clip.id === selectedClipId ? splitClipAt(clip, currentTime) : clip)) })),
      saveStatus: 'alterado',
    }))
  },

  deleteSelectedClip: () => {
    const selectedClipId = get().selectedClipId
    if (!selectedClipId) return
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (project) => ({ ...project, clips: project.clips.filter((clip) => clip.id !== selectedClipId) })),
      selectedClipId: undefined,
      saveStatus: 'alterado',
    }))
  },

  duplicateSelectedClip: () => {
    const selectedClipId = get().selectedClipId
    if (!selectedClipId) return
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (project) => {
        const selected = project.clips.find((clip) => clip.id === selectedClipId)
        if (!selected) return project
        return { ...project, clips: [...project.clips, moveClip({ ...selected, id: crypto.randomUUID() }, selected.start + selected.duration + 0.2)] }
      }),
      saveStatus: 'alterado',
    }))
  },
  setTimelineZoom: (zoom) => set((state) => ({
    currentProject: mutateProject(state.currentProject, (project) => ({
      ...project,
      globalSettings: { ...project.globalSettings, timelineZoom: Math.min(4, Math.max(0.4, zoom)) },
    })),
    saveStatus: 'alterado',
  })),

  exportCaptionsSrt: () => {
    const project = get().currentProject
    if (!project) return
    const content = project.captions.map((caption, index) => `${index + 1}\n${formatSrtTime(caption.start)} --> ${formatSrtTime(caption.start + caption.duration)}\n${caption.text}\n`).join('\n')
    const url = URL.createObjectURL(new Blob([content || ''], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.title.replace(/[^\w-]+/g, '-').toLowerCase() || 'legendas'}.srt`
    anchor.click()
    URL.revokeObjectURL(url)
  },

  importCaptionsSrt: async (file) => {
    const text = await file.text()
    const captions = parseSrt(text)
    if (!captions.length) {
      set({ lastError: 'Nenhuma legenda valida encontrada no SRT.' })
      return
    }
    set((state) => ({
      currentProject: mutateProject(state.currentProject, (project) => ({
        ...project,
        captions: [
          ...project.captions,
          ...captions.map((caption) => ({
            id: crypto.randomUUID(),
            type: 'caption' as const,
            trackId: 'track_caption_1',
            start: caption.start,
            duration: caption.duration,
            text: caption.text,
            style: { fontFamily: 'Arial', fontSize: 42, fontWeight: '700', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.6)', align: 'center' as const, position: 'bottom' as const },
          })),
        ],
      })),
      lastError: undefined,
      saveStatus: 'alterado',
    }))
  },

  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  installPack: async (id) => {
    const pack = get().availablePacks.find((item) => item.id === id) || mockPacks.find((item) => item.id === id)
    if (!pack) return
    try {
      const validation = validatePackManifest(pack.manifest)
      if (!pack.packageUrl && !pack.manifestUrl && !validation.valid) {
        set({ lastError: validation.error })
        return
      }
      const installable = await resolveInstallablePack(pack)
      await saveInstalledPack(installable.record)
      for (const asset of installable.assets) await saveInstalledPackAsset(asset)
      await get().refreshInstalledPacks()
      set({ lastError: undefined })
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Nao foi possivel instalar o pacote.' })
    }
  },
  removePack: async (id) => {
    await deleteInstalledPack(id)
    await get().refreshInstalledPacks()
  },
  updateExportSettings: (patch) => set((state) => ({ exportSettings: { ...state.exportSettings, ...patch } })),
  cancelRender: () => {
    if (activeRenderCancelToken) activeRenderCancelToken.cancelled = true
    set({ isRendering: false, renderStatus: 'Exportacao cancelada', renderProgress: 0 })
  },
  renderCurrentProject: async () => {
    const project = get().currentProject
    if (!project) return
    const cancelToken = { cancelled: false }
    activeRenderCancelToken = cancelToken
    set({ isRendering: true, renderProgress: 0, renderStatus: 'Preparando exportacao', lastError: undefined })
    try {
      const result = await renderProjectWithFfmpegWorker(project, get().exportSettings, (progress, status) => {
        set({ renderProgress: progress, renderStatus: status })
      }, () => cancelToken.cancelled)
      downloadRenderResult(result)
      set({ isRendering: false, renderProgress: 100, renderStatus: `Arquivo gerado: ${result.fileName}` })
    } catch (error) {
      if (cancelToken.cancelled) {
        set({ isRendering: false, renderProgress: 0, renderStatus: 'Exportacao cancelada' })
        return
      }
      try {
        set({ renderStatus: 'FFmpeg indisponivel para este projeto. Usando fallback do navegador.' })
        const result = await renderProjectInBrowser(project, get().exportSettings, (progress, status) => {
          set({ renderProgress: progress, renderStatus: status })
        })
        downloadRenderResult(result)
        set({ isRendering: false, renderProgress: 100, renderStatus: `Arquivo gerado: ${result.fileName}` })
      } catch (fallbackError) {
        set({
          isRendering: false,
          renderStatus: 'Erro na exportacao',
          lastError: fallbackError instanceof Error ? fallbackError.message : error instanceof Error ? error.message : 'Nao foi possivel exportar o video.',
        })
      }
    }
  },
  getExportPlan: () => {
    const project = get().currentProject
    if (!project) return undefined
    return buildFfmpegPlan(project, get().exportSettings)
  },
}))

export { exportPresets }

function mergePacks(localPacks: EffectPack[], onlinePacks: EffectPack[]) {
  const byId = new Map<string, EffectPack>()
  for (const pack of localPacks) byId.set(pack.id, pack)
  for (const pack of onlinePacks) byId.set(pack.id, pack)
  return Array.from(byId.values())
}
