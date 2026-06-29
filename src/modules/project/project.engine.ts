import type { ProjectJson, TimelineTrack, VideoFormat } from './project.types'

export const PROJECT_FORMATS: Record<
  VideoFormat,
  { label: string; width: number; height: number; description: string }
> = {
  '9:16': { label: 'Vertical / Reels / Stories', width: 1080, height: 1920, description: 'Conteudo vertical para celular' },
  '16:9': { label: 'YouTube / Paisagem', width: 1920, height: 1080, description: 'Videos horizontais e apresentacoes' },
  '1:1': { label: 'Quadrado / Feed', width: 1080, height: 1080, description: 'Posts quadrados para redes sociais' },
  '4:5': { label: 'Post Vertical', width: 1080, height: 1350, description: 'Feed vertical com bom aproveitamento' },
  custom: { label: 'Personalizado', width: 1080, height: 1920, description: 'Defina largura e altura manualmente' },
}

const now = () => new Date().toISOString()

export function createDefaultTracks(): TimelineTrack[] {
  return [
    { id: 'track_video_1', type: 'video', name: 'Video 1', locked: false, visible: true, muted: false, height: 64, order: 1 },
    { id: 'track_overlay_1', type: 'overlay', name: 'Sobreposicao', locked: false, visible: true, muted: false, height: 58, order: 2 },
    { id: 'track_text_1', type: 'text', name: 'Texto', locked: false, visible: true, muted: false, height: 58, order: 3 },
    { id: 'track_caption_1', type: 'caption', name: 'Legendas', locked: false, visible: true, muted: false, height: 54, order: 4 },
    { id: 'track_audio_1', type: 'audio', name: 'Audio 1', locked: false, visible: true, muted: false, height: 54, order: 5 },
  ]
}

export function createProject(input: {
  title: string
  format: VideoFormat
  width?: number
  height?: number
  fps?: number
  background?: string
}): ProjectJson {
  const format = PROJECT_FORMATS[input.format]
  const createdAt = now()
  const width = input.format === 'custom' ? input.width || format.width : format.width
  const height = input.format === 'custom' ? input.height || format.height : format.height

  return {
    id: crypto.randomUUID(),
    title: input.title.trim() || 'Meu Video',
    createdAt,
    updatedAt: createdAt,
    format: input.format,
    width,
    height,
    duration: 0,
    fps: input.fps || 30,
    background: input.background || '#000000',
    assets: [],
    tracks: createDefaultTracks(),
    clips: [],
    captions: [],
    transitions: [],
    globalSettings: { snapEnabled: true, timelineZoom: 1, previewZoom: 1 },
  }
}

export function touchProject(project: ProjectJson): ProjectJson {
  return {
    ...project,
    updatedAt: now(),
    duration: Math.max(
      0,
      ...project.clips.map((clip) => clip.start + clip.duration),
      ...project.captions.map((caption) => caption.start + caption.duration),
    ),
  }
}
