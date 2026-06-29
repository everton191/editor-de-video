import type { ProjectJson, TimelineClip } from '../project/project.types'
import type { ExportSettings } from './render.types'
import { drawFrame, preloadMedia, resolveOutputSize, type BrowserMediaCache, type BrowserRenderResult } from './browser-renderer'

const MAX_FFMPEG_DURATION_SECONDS = 10
const MAX_FFMPEG_FRAMES = 240
const MAX_FFMPEG_PIXELS = 1280 * 1280
const MAX_FFMPEG_ASSET_BYTES = 24 * 1024 * 1024

type FfmpegWorkerDone = { id: string; type: 'done'; output: ArrayBuffer; mimeType: string }
type FfmpegWorkerProgress = { id: string; type: 'progress'; progress: number; status: string }
type FfmpegWorkerError = { id: string; type: 'error'; message: string }
type FfmpegWorkerMessage = FfmpegWorkerDone | FfmpegWorkerProgress | FfmpegWorkerError

export function getFfmpegSmallProjectBlocker(project: ProjectJson, settings: ExportSettings) {
  const { width, height } = resolveOutputSize(project, settings)
  const fps = settings.fps === 'original' ? Math.min(project.fps, 30) : Math.min(settings.fps, 30)
  const duration = Math.max(1, project.duration)
  const visualClips = project.clips.filter((clip) => clip.type !== 'audio')
  const audioClips = project.clips.filter((clip) => clip.type === 'audio')
  const totalAssetBytes = project.assets.reduce((total, asset) => total + asset.size, 0)

  if (!visualClips.length) return 'Adicione pelo menos um clipe visual para exportar com FFmpeg.'
  if (audioClips.length) return 'FFmpeg.wasm nesta fase exporta video visual; projetos com audio usam o fallback atual.'
  if (duration > MAX_FFMPEG_DURATION_SECONDS) return `FFmpeg.wasm nesta fase aceita ate ${MAX_FFMPEG_DURATION_SECONDS}s.`
  if (Math.ceil(duration * fps) > MAX_FFMPEG_FRAMES) return `Projeto passou de ${MAX_FFMPEG_FRAMES} frames para FFmpeg.wasm.`
  if (width * height > MAX_FFMPEG_PIXELS) return 'Use 720p/original pequeno para render FFmpeg.wasm nesta fase.'
  if (totalAssetBytes > MAX_FFMPEG_ASSET_BYTES) return 'Midias muito grandes para FFmpeg.wasm no navegador.'
  return undefined
}

export async function renderProjectWithFfmpegWorker(
  project: ProjectJson,
  settings: ExportSettings,
  onProgress: (progress: number, status: string) => void,
): Promise<BrowserRenderResult> {
  const blocker = getFfmpegSmallProjectBlocker(project, settings)
  if (blocker) throw new Error(blocker)

  const { width, height } = resolveOutputSize(project, settings)
  const fps = settings.fps === 'original' ? Math.min(project.fps, 30) : Math.min(settings.fps, 30)
  const duration = Math.max(1, project.duration)
  const frameCount = Math.max(1, Math.ceil(duration * fps))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas nao disponivel para preparar o FFmpeg.')

  onProgress(2, 'Carregando midias locais')
  const mediaCache = await preloadMedia(project)
  const frames: ArrayBuffer[] = []

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / fps
    await seekActiveVideos(project, mediaCache, time)
    drawFrame(context, project, mediaCache, time, width, height, settings)
    frames.push(await canvasToPngBuffer(canvas))
    onProgress(5 + Math.round((frame / frameCount) * 45), 'Gerando frames para FFmpeg')
    await yieldToBrowser()
  }

  onProgress(52, 'Iniciando worker FFmpeg')
  const result = await encodeFramesInWorker({ fps, frames, width, height, quality: qualityToQscale(settings.quality) }, onProgress)
  return {
    blob: new Blob([result.output], { type: result.mimeType }),
    fileName: `${project.title.replace(/[^\w-]+/g, '-').toLowerCase() || 'videolab-export'}-ffmpeg.mp4`,
    mimeType: result.mimeType,
  }
}

function qualityToQscale(quality: ExportSettings['quality']) {
  if (quality === 'maxima') return 2
  if (quality === 'alta') return 4
  if (quality === 'boa') return 6
  return 9
}

async function seekActiveVideos(project: ProjectJson, mediaCache: BrowserMediaCache, time: number) {
  const activeVideoClips = project.clips.filter((clip) => clip.type === 'video' && time >= clip.start && time <= clip.start + clip.duration)
  await Promise.all(activeVideoClips.map((clip) => seekVideoClip(clip, mediaCache, time)))
}

function seekVideoClip(clip: TimelineClip, mediaCache: BrowserMediaCache, time: number) {
  const video = clip.assetId ? mediaCache.get(clip.assetId) : undefined
  if (!(video instanceof HTMLVideoElement)) return Promise.resolve()
  const target = Math.min(Math.max(0, clip.trimStart + time - clip.start), video.duration || clip.duration)
  if (!Number.isFinite(target) || Math.abs(video.currentTime - target) < 0.04) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const finish = () => {
      video.removeEventListener('seeked', finish)
      resolve()
    }
    video.addEventListener('seeked', finish, { once: true })
    video.currentTime = target
    window.setTimeout(finish, 350)
  })
}

function canvasToPngBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Nao foi possivel gerar frame PNG.'))
        return
      }
      blob.arrayBuffer().then(resolve).catch(reject)
    }, 'image/png')
  })
}

function encodeFramesInWorker(
  input: { fps: number; frames: ArrayBuffer[]; width: number; height: number; quality: number },
  onProgress: (progress: number, status: string) => void,
) {
  const id = crypto.randomUUID()
  const worker = new Worker(new URL('./ffmpeg-render.worker.ts', import.meta.url), { type: 'module' })
  return new Promise<FfmpegWorkerDone>((resolve, reject) => {
    worker.onmessage = ({ data }: MessageEvent<FfmpegWorkerMessage>) => {
      if (data.id !== id) return
      if (data.type === 'progress') onProgress(data.progress, data.status)
      if (data.type === 'error') {
        worker.terminate()
        reject(new Error(data.message))
      }
      if (data.type === 'done') {
        worker.terminate()
        resolve(data)
      }
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Worker FFmpeg falhou.'))
    }
    worker.postMessage({ id, ...input }, input.frames)
  })
}

function yieldToBrowser() {
  return new Promise((resolve) => window.setTimeout(resolve, 0))
}
