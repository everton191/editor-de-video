import type { PackManifest } from './packs.types'

const executableExtensions = ['.js', '.mjs', '.cjs', '.exe', '.bat', '.cmd', '.ps1', '.sh']

export function validatePackManifest(manifest: PackManifest) {
  if (!manifest.id || !manifest.name || !manifest.version || !manifest.type || !manifest.compatibility) {
    return { valid: false, error: 'Manifest invalido: id, name, version, type e compatibility sao obrigatorios.' }
  }
  if (!Array.isArray(manifest.items)) return { valid: false, error: 'Manifest invalido: items deve ser uma lista.' }
  const invalidItem = manifest.items.find((item) => {
    const file = item.file.toLowerCase()
    return !item.id || !item.type || !item.name || !item.file || executableExtensions.some((ext) => file.endsWith(ext))
  })
  if (invalidItem) return { valid: false, error: 'Manifest invalido: itens precisam de id, type, name, file e nao podem executar scripts.' }
  return { valid: true }
}
