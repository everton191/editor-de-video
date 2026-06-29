export interface LocalSettingsRecord {
  id: string
  default_export_resolution: string
  default_export_quality: string
  default_fps: number
  default_bitrate: string
  use_local_render: boolean
  cache_limit: number
  theme: 'dark' | 'light'
  created_at: string
  updated_at: string
}
