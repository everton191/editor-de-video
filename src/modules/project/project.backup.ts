import type { ProjectJson } from './project.types'

export function downloadProjectBackup(project: ProjectJson) {
  const safeTitle = project.title.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase()
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeTitle || 'videolab-projeto'}.videolab.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readProjectBackup(file: File): Promise<ProjectJson> {
  const text = await file.text()
  const parsed = JSON.parse(text) as ProjectJson
  if (!parsed.id || !parsed.title || !Array.isArray(parsed.tracks) || !Array.isArray(parsed.clips)) {
    throw new Error('Arquivo de projeto invalido.')
  }
  return parsed
}
