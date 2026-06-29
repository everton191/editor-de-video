import type { AssetType, EditorAsset } from '../project/project.types'

const acceptedTypes: Record<'video' | 'image' | 'audio', string[]> = {
  video: ['video/mp4', 'video/webm'],
  image: ['image/png', 'image/jpeg', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
}

export function detectAssetType(file: File): AssetType | null {
  if (acceptedTypes.video.includes(file.type)) return 'video'
  if (acceptedTypes.image.includes(file.type)) return 'image'
  if (acceptedTypes.audio.includes(file.type)) return 'audio'
  return null
}

export function validateMediaFile(file: File) {
  const type = detectAssetType(file)
  if (!type) {
    return { valid: false, error: 'Este arquivo nao pode ser importado. Verifique o formato ou tente converter para MP4.' }
  }
  return { valid: true, type }
}

export function createAssetFromFile(file: File, type: AssetType, src: string): EditorAsset {
  return {
    id: crypto.randomUUID(),
    type,
    name: file.name,
    src,
    mimeType: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
  }
}

export async function createAssetWithMetadata(file: File, type: AssetType, src: string): Promise<EditorAsset> {
  const asset = createAssetFromFile(file, type, src)
  const metadata = await readMediaMetadata(file, type, src)
  return {
    ...asset,
    ...metadata,
  }
}

async function readMediaMetadata(file: File, type: AssetType, src: string) {
  if (type === 'image') return readImageMetadata(src)
  if (type === 'video') return readVideoMetadata(src)
  if (type === 'audio') return readAudioMetadata(src)
  return { size: file.size }
}

function readImageMetadata(src: string): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({})
    image.src = src
  })
}

function readVideoMetadata(src: string): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration })
    video.onerror = () => resolve({})
    video.src = src
  })
}

function readAudioMetadata(src: string): Promise<{ duration?: number }> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => resolve({ duration: audio.duration })
    audio.onerror = () => resolve({})
    audio.src = src
  })
}
