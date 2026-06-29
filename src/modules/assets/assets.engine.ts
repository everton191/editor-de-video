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
