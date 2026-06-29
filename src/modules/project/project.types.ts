export type VideoFormat = '9:16' | '16:9' | '1:1' | '4:5' | 'custom'

export type AssetType =
  | 'video'
  | 'image'
  | 'audio'
  | 'sticker'
  | 'font'
  | 'overlay'
  | 'template'
  | 'effect'

export type TrackType = 'video' | 'image' | 'text' | 'caption' | 'audio' | 'effect' | 'overlay'
export type ClipType = TrackType
export type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'

export interface Keyframe {
  property: string
  time: number
  value: number | string
  easing: Easing
}

export interface EditorAsset {
  id: string
  type: AssetType
  name: string
  src: string
  mimeType: string
  size: number
  duration?: number
  width?: number
  height?: number
  thumbnail?: string
  createdAt: string
}

export interface TimelineTrack {
  id: string
  type: TrackType
  name: string
  locked: boolean
  visible: boolean
  muted: boolean
  height: number
  order: number
}

export interface ClipEffect {
  id: string
  type: string
  name: string
  enabled: boolean
  params: Record<string, number | string | boolean>
}

export interface TextStyle {
  fontFamily: string
  fontSize: number
  fontWeight: string
  fontStyle: 'normal' | 'italic'
  color: string
  backgroundColor: string
  strokeColor: string
  strokeWidth: number
  shadow: {
    enabled: boolean
    color: string
    blur: number
    offsetX: number
    offsetY: number
  }
  align: 'left' | 'center' | 'right'
  opacity: number
}

export interface TimelineClip {
  id: string
  type: ClipType
  trackId: string
  assetId?: string
  start: number
  duration: number
  trimStart: number
  trimEnd: number
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
  scale: number
  rotation: number
  opacity: number
  volume: number
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay'
  effects: ClipEffect[]
  animations: string[]
  keyframes: Keyframe[]
  metadata: Record<string, unknown>
  text?: string
  style?: TextStyle
}

export interface CaptionClip {
  id: string
  type: 'caption'
  trackId: string
  start: number
  duration: number
  text: string
  style: {
    fontFamily: string
    fontSize: number
    fontWeight: string
    color: string
    backgroundColor: string
    align: 'left' | 'center' | 'right'
    position: 'top' | 'center' | 'bottom'
  }
}

export interface VideoTransition {
  id: string
  type: string
  fromClipId: string
  toClipId: string
  start: number
  duration: number
  params: Record<string, number | string | boolean>
}

export interface ProjectJson {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  format: VideoFormat
  width: number
  height: number
  duration: number
  fps: number
  background: string
  assets: EditorAsset[]
  tracks: TimelineTrack[]
  clips: TimelineClip[]
  captions: CaptionClip[]
  transitions: VideoTransition[]
  globalSettings: {
    snapEnabled: boolean
    timelineZoom: number
    previewZoom: number
  }
}

export interface ProjectRecord {
  id: string
  title: string
  format: VideoFormat
  width: number
  height: number
  duration: number
  fps: number
  thumbnail?: string
  project_json: ProjectJson
  created_at: string
  updated_at: string
}

export interface ProjectVersionRecord {
  id: string
  project_id: string
  version_number: number
  project_json: ProjectJson
  created_at: string
}

export interface ProjectAssetRecord {
  id: string
  project_id: string
  asset_id: string
  type: AssetType
  name: string
  mime_type: string
  size: number
  blob: Blob
  created_at: string
}
