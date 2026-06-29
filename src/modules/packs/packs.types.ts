export type PackStatus = 'disponivel' | 'instalado' | 'atualizacao'

export interface PackManifestItem {
  id: string
  type: string
  name: string
  file: string
  preview?: string
  payload?: Record<string, string | number | boolean>
}

export interface PackManifest {
  id: string
  name: string
  version: string
  type: string
  description: string
  cover: string
  preview?: string
  compatibility: { editor_min_version: string }
  items: PackManifestItem[]
  license: 'free-personal-use'
  author: string
}

export interface EffectPack {
  id: string
  name: string
  category: string
  cover: string
  preview: string
  size: string
  version: string
  author: string
  status: PackStatus
  manifest: PackManifest
  source?: 'local' | 'github'
  packageUrl?: string
  manifestUrl?: string
  bytes?: number
}

export interface InstalledPackRecord {
  id: string
  status: PackStatus
  manifest: PackManifest
  source?: string
  package_url?: string
  updated_at: string
}

export interface InstalledPackAssetRecord {
  id: string
  pack_id: string
  path: string
  mime_type: string
  blob: Blob
  created_at: string
}

export interface PackCatalog {
  id: string
  name: string
  version: string
  updatedAt: string
  packs: EffectPack[]
}
