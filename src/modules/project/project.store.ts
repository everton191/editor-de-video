import { create } from 'zustand'
import { createAssetFromFile, detectAssetType, validateMediaFile } from '../assets/assets.engine'
import { buildFfmpegPlan, exportPresets } from '../render/render.engine'
import type { ExportSettings } from '../render/render.types'
import { createClipFromAsset, moveClip, splitClipAt } from '../timeline/timeline.engine'
import { createProject, touchProject } from './project.engine'
import { deleteProject, getProject, listProjects, saveProject, saveProjectVersion } from './project.persistence'
import type { EditorAsset, ProjectJson, ProjectRecord, TextStyle, TimelineClip, VideoFormat } from './project.types'

type SaveStatus = 'salvo' | 'alterado' | 'salvando' | 'erro'
type AppView = 'home' | 'new-project' | 'editor' | 'export' | 'packs' | 'settings'

interface EditorState {
  view: AppView
  projects: ProjectRecord[]
  currentProject?: ProjectJson
  selectedClipId?: string
  currentTime: number
  isPlaying: boolean
  saveStatus: SaveStatus
  installedPackIds: string[]
  lastError?: string
  exportSettings: ExportSettings
  goTo: (view: AppView) => void
  refreshProjects: () => Promise<void>
  createNewProject: (input: { title: string; format: VideoFormat; width?: number; height?: number; fps?: number }) => Promise<void>
  openProject: (id: string) => Promise<void>
  duplicateProject: (id: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  saveCurrentProject: (important?: boolean) => Promise<void>
  importFiles: (files: FileList | File[]) => Promise<void>
  addTextClip: () => void
  addCaption: () => void
  selectClip: (id?: string) => void
  updateClip: (id: string, patch: Partial<TimelineClip>) => void
  splitSelectedClip: () => void
  deleteSelectedClip: () => void
  duplicateSelectedClip: () => void
  setCurrentTime: (time: number) => void
  togglePlayback: () => void
  installPack: (id: string) => void
  removePack: (id: string) => void
  updateExportSettings: (patch: Partial<ExportSettings>) => void
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

export const useEditorStore = create<EditorState>((set, get) => ({
  view: 'home',
  projects: [],
  currentTime: 0,
  isPlaying: false,
  saveStatus: 'salvo',
  installedPackIds: [],
  exportSettings: defaultExportSettings,

  goTo: (view) => set({ view }),

  refreshProjects: async () => {
    set({ projects: await listProjects() })
  },

  createNewProject: async (input) => {
    const project = createProject(input)
    await saveProject(toProjectRecord(project))
    set({ currentProject: project, currentTime: 0, selectedClipId: undefined, view: 'editor', saveStatus: 'salvo' })
    await get().refreshProjects()
  },

  openProject: async (id) => {
    const record = await getProject(id)
    if (!record) {
      set({ lastError: 'Projeto nao encontrado.' })
      return
    }
    set({ currentProject: record.project_json, selectedClipId: undefined, currentTime: 0, view: 'editor', saveStatus: 'salvo' })
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
      const asset = createAssetFromFile(file, type, URL.createObjectURL(file))
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

  selectClip: (id) => set({ selectedClipId: id }),
  updateClip: (id, patch) => set((state) => ({
    currentProject: mutateProject(state.currentProject, (project) => ({ ...project, clips: project.clips.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)) })),
    saveStatus: 'alterado',
  })),

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

  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  installPack: (id) => set((state) => ({ installedPackIds: state.installedPackIds.includes(id) ? state.installedPackIds : [...state.installedPackIds, id] })),
  removePack: (id) => set((state) => ({ installedPackIds: state.installedPackIds.filter((packId) => packId !== id) })),
  updateExportSettings: (patch) => set((state) => ({ exportSettings: { ...state.exportSettings, ...patch } })),
  getExportPlan: () => {
    const project = get().currentProject
    if (!project) return undefined
    return buildFfmpegPlan(project, get().exportSettings)
  },
}))

export { exportPresets }
