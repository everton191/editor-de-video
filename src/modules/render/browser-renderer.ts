import type { ProjectJson, TimelineClip } from '../project/project.types'
import type { ExportSettings } from './render.types'

export interface BrowserRenderResult {
  blob: Blob
  fileName: string
  mimeType: string
}

const resolutionMap = {
  '720p': { landscape: [1280, 720], portrait: [720, 1280] },
  '1080p': { landscape: [1920, 1080], portrait: [1080, 1920] },
  '1440p': { landscape: [2560, 1440], portrait: [1440, 2560] },
  '2160p': { landscape: [3840, 2160], portrait: [2160, 3840] },
} as const

export async function renderProjectInBrowser(
  project: ProjectJson,
  settings: ExportSettings,
  onProgress: (progress: number, status: string) => void,
): Promise<BrowserRenderResult> {
  const { width, height } = resolveOutputSize(project, settings)
  const fps = settings.fps === 'original' ? project.fps : settings.fps
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas nao disponivel para exportacao.')

  const mimeType = pickRecorderMimeType()
  const stream = canvas.captureStream(fps)
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const mediaCache = await preloadMedia(project)
  const duration = Math.max(1, project.duration)
  const frameCount = Math.max(1, Math.ceil(duration * fps))

  recorder.start(100)
  onProgress(0, 'Renderizando frames')

  for (let frame = 0; frame <= frameCount; frame += 1) {
    const time = frame / fps
    drawFrame(context, project, mediaCache, time, width, height, settings)
    onProgress(Math.min(99, Math.round((frame / frameCount) * 100)), 'Processando video')
    await waitFrame(fps)
  }

  const blob = await stopRecorder(recorder, chunks)
  onProgress(100, 'Finalizado')
  return {
    blob,
    fileName: `${project.title.replace(/[^\w-]+/g, '-').toLowerCase() || 'videolab-export'}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`,
    mimeType,
  }
}

export function downloadRenderResult(result: BrowserRenderResult) {
  const url = URL.createObjectURL(result.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = result.fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function resolveOutputSize(project: ProjectJson, settings: ExportSettings) {
  if (settings.resolution === 'original' || settings.resolution === 'custom') return { width: project.width, height: project.height }
  const orientation = project.height > project.width ? 'portrait' : 'landscape'
  const size = resolutionMap[settings.resolution][orientation]
  return { width: size[0], height: size[1] }
}

function pickRecorderMimeType() {
  const candidates = ['video/mp4;codecs=h264', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || 'video/webm'
}

async function preloadMedia(project: ProjectJson) {
  const entries = await Promise.all(
    project.assets.map(async (asset) => {
      if (asset.type === 'image') return [asset.id, await loadImage(asset.src)] as const
      if (asset.type === 'video') return [asset.id, await loadVideo(asset.src)] as const
      return [asset.id, undefined] as const
    }),
  )
  return new Map<string, HTMLImageElement | HTMLVideoElement | undefined>(entries)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nao foi possivel carregar imagem para exportacao.'))
    image.src = src
  })
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => reject(new Error('Nao foi possivel carregar video para exportacao.'))
    video.src = src
  })
}

function drawFrame(
  context: CanvasRenderingContext2D,
  project: ProjectJson,
  mediaCache: Map<string, HTMLImageElement | HTMLVideoElement | undefined>,
  time: number,
  width: number,
  height: number,
  settings: ExportSettings,
) {
  context.save()
  context.fillStyle = project.background
  context.fillRect(0, 0, width, height)
  const scaleX = width / project.width
  const scaleY = height / project.height
  const activeClips = project.clips
    .filter((clip) => time >= clip.start && time <= clip.start + clip.duration)
    .sort((a, b) => project.tracks.find((track) => track.id === a.trackId)!.order - project.tracks.find((track) => track.id === b.trackId)!.order)

  for (const clip of activeClips) {
    drawClip(context, clip, mediaCache, time, scaleX, scaleY, settings)
  }
  context.restore()
}

function drawClip(
  context: CanvasRenderingContext2D,
  clip: TimelineClip,
  mediaCache: Map<string, HTMLImageElement | HTMLVideoElement | undefined>,
  time: number,
  scaleX: number,
  scaleY: number,
  settings: ExportSettings,
) {
  context.save()
  context.globalAlpha = clip.opacity
  context.translate(clip.position.x * scaleX, clip.position.y * scaleY)
  context.rotate((clip.rotation * Math.PI) / 180)
  context.scale(clip.scale, clip.scale)
  if (settings.improveContrast || settings.improveSaturation || settings.sharpen) {
    context.filter = `contrast(${settings.improveContrast ? 1.05 : 1}) saturate(${settings.improveSaturation ? 1.08 : 1})`
  }

  if (clip.type === 'text') {
    context.font = `${clip.style?.fontWeight || '700'} ${(clip.style?.fontSize || 72) * scaleY}px ${clip.style?.fontFamily || 'Arial'}`
    context.fillStyle = clip.style?.color || '#ffffff'
    context.textAlign = clip.style?.align || 'center'
    context.textBaseline = 'middle'
    context.fillText(clip.text || '', 0, 0, clip.size.width * scaleX)
  } else if (clip.assetId) {
    const media = mediaCache.get(clip.assetId)
    if (media instanceof HTMLVideoElement) {
      const localTime = Math.max(0, clip.trimStart + time - clip.start)
      if (Number.isFinite(localTime) && Math.abs(media.currentTime - localTime) > 0.08) media.currentTime = Math.min(localTime, media.duration || localTime)
      context.drawImage(media, (-clip.size.width * scaleX) / 2, (-clip.size.height * scaleY) / 2, clip.size.width * scaleX, clip.size.height * scaleY)
    } else if (media instanceof HTMLImageElement) {
      context.drawImage(media, (-clip.size.width * scaleX) / 2, (-clip.size.height * scaleY) / 2, clip.size.width * scaleX, clip.size.height * scaleY)
    }
  }
  context.restore()
}

function stopRecorder(recorder: MediaRecorder, chunks: Blob[]): Promise<Blob> {
  return new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }))
    recorder.stop()
  })
}

function waitFrame(fps: number) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(1, 1000 / fps)))
}
