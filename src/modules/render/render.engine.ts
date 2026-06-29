import type { ProjectJson } from '../project/project.types'
import type { ExportSettings } from './render.types'

export const exportPresets: Array<{
  id: string
  name: string
  description: string
  settings: Partial<ExportSettings>
}> = [
  { id: 'melhorar-levemente', name: 'Melhorar levemente', description: 'Nitidez, contraste e saturacao leves.', settings: { resolution: '1080p', quality: 'alta', improveQuality: true, sharpen: true } },
  { id: 'instagram-reels', name: 'Video para Instagram/Reels', description: '1080x1920, 30 FPS e bitrate alto.', settings: { resolution: '1080p', fps: 30, quality: 'alta', improveQuality: true } },
  { id: 'exportar-4k', name: 'Exportar em 4K', description: 'Escala Lanczos e qualidade maxima.', settings: { resolution: '2160p', quality: 'maxima', improveQuality: true, sharpen: true, denoise: true } },
  { id: 'arquivo-leve', name: 'Arquivo leve', description: 'Compressao equilibrada para compartilhar rapido.', settings: { resolution: '720p', quality: 'boa', improveQuality: false } },
]

export function buildFfmpegPlan(project: ProjectJson, settings: ExportSettings) {
  const filters = [`fps=${settings.fps === 'original' ? project.fps : settings.fps}`]
  if (settings.resolution === '2160p') filters.push('scale=3840:2160:flags=lanczos')
  if (settings.resolution === '1440p') filters.push('scale=2560:1440:flags=lanczos')
  if (settings.resolution === '1080p') filters.push(`scale=${project.format === '9:16' ? '1080:1920' : '1920:1080'}:flags=lanczos`)
  if (settings.resolution === '720p') filters.push(`scale=${project.format === '9:16' ? '720:1280' : '1280:720'}:flags=lanczos`)
  if (settings.sharpen) filters.push('unsharp=5:5:0.8')
  if (settings.denoise) filters.push('hqdn3d=1.5:1.5:6:6')
  if (settings.improveContrast || settings.improveSaturation) filters.push('eq=contrast=1.05:saturation=1.08')
  return {
    mode: 'browser-preview',
    note: 'Plano preparado para FFmpeg. A exportacao completa sera evoluida para worker/FFmpeg local.',
    inputCount: project.assets.length,
    filters,
  }
}
