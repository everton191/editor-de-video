import JSZip from 'jszip'
import { validatePackManifest } from './manifest.validator'
import type { EffectPack, InstalledPackAssetRecord, InstalledPackRecord, PackCatalog, PackManifest } from './packs.types'

export const DEFAULT_PACK_CATALOG_URL = 'https://raw.githubusercontent.com/everton191/editor-de-video/main/public/packs/catalog.json'
const MAX_PACK_BYTES = 1024 * 1024 * 250

export async function fetchPackCatalog(url = DEFAULT_PACK_CATALOG_URL): Promise<PackCatalog> {
  const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Falha ao buscar catalogo: HTTP ${response.status}`)
  const catalog = await response.json() as PackCatalog
  if (!catalog.id || !Array.isArray(catalog.packs)) throw new Error('Catalogo de pacotes invalido.')
  return {
    ...catalog,
    packs: catalog.packs.map((pack) => ({ ...pack, source: 'github' as const })),
  }
}

export async function resolveInstallablePack(pack: EffectPack): Promise<{ record: InstalledPackRecord; assets: InstalledPackAssetRecord[] }> {
  if (pack.packageUrl) return resolveZipPack(pack)
  const manifest = pack.manifestUrl ? await fetchManifest(pack.manifestUrl) : pack.manifest
  validateOrThrow(manifest)
  return {
    record: toInstalledPack(pack, manifest),
    assets: [],
  }
}

async function fetchManifest(url: string): Promise<PackManifest> {
  const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Falha ao baixar manifest: HTTP ${response.status}`)
  return await response.json() as PackManifest
}

async function resolveZipPack(pack: EffectPack) {
  const response = await fetch(pack.packageUrl as string, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Falha ao baixar pacote: HTTP ${response.status}`)
  const blob = await response.blob()
  if (blob.size > MAX_PACK_BYTES) throw new Error('Pacote maior que o limite de seguranca.')
  const zip = await JSZip.loadAsync(blob)
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('Pacote sem manifest.json.')
  const manifest = JSON.parse(await manifestFile.async('string')) as PackManifest
  validateOrThrow(manifest)
  const assets: InstalledPackAssetRecord[] = []
  const createdAt = new Date().toISOString()
  for (const file of Object.values(zip.files)) {
    if (file.dir || file.name === 'manifest.json') continue
    if (isUnsafePath(file.name)) throw new Error('Pacote contem caminho inseguro.')
    assets.push({
      id: crypto.randomUUID(),
      pack_id: manifest.id,
      path: file.name,
      mime_type: detectMime(file.name),
      blob: await file.async('blob'),
      created_at: createdAt,
    })
  }
  return { record: toInstalledPack(pack, manifest), assets }
}

function validateOrThrow(manifest: PackManifest) {
  const validation = validatePackManifest(manifest)
  if (!validation.valid) throw new Error(validation.error)
}

function toInstalledPack(pack: EffectPack, manifest: PackManifest): InstalledPackRecord {
  return {
    id: manifest.id,
    status: 'instalado',
    manifest,
    source: pack.source || 'github',
    package_url: pack.packageUrl || pack.manifestUrl,
    updated_at: new Date().toISOString(),
  }
}

function isUnsafePath(path: string) {
  return path.includes('..') || path.startsWith('/') || path.startsWith('\\')
}

function detectMime(path: string) {
  const lower = path.toLowerCase()
  if (lower.endsWith('.json')) return 'application/json'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.mp4')) return 'video/mp4'
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.mp3')) return 'audio/mpeg'
  if (lower.endsWith('.wav')) return 'audio/wav'
  return 'application/octet-stream'
}
