export type PackStatus = 'disponivel' | 'instalado' | 'atualizacao'

export interface PackManifestItem {
  id: string
  type: string
  name: string
  file: string
  preview?: string
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
}

export interface InstalledPackRecord {
  id: string
  status: PackStatus
  manifest: PackManifest
  updated_at: string
}
