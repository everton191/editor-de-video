export type RenderStatus = 'fila' | 'preparando' | 'processando' | 'finalizado' | 'erro' | 'cancelado'

export interface ExportSettings {
  resolution: 'original' | '720p' | '1080p' | '1440p' | '2160p' | 'custom'
  fps: 'original' | 24 | 30 | 60
  quality: 'leve' | 'boa' | 'alta' | 'maxima'
  bitrate: 'auto' | number
  improveQuality: boolean
  sharpen: boolean
  denoise: boolean
  improveContrast: boolean
  improveSaturation: boolean
}

export interface ExportRecord {
  id: string
  project_id: string
  status: RenderStatus
  resolution: string
  fps: string
  quality: string
  output_ref?: string
  error_message?: string
  created_at: string
  finished_at?: string
}
