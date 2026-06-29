import Dexie, { type Table } from 'dexie'
import type { ProjectRecord, ProjectVersionRecord } from './project.types'
import type { InstalledPackRecord } from '../packs/packs.types'
import type { LocalSettingsRecord } from '../settings/settings.types'
import type { ExportRecord } from '../render/render.types'

class VideoLabDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>
  project_versions!: Table<ProjectVersionRecord, string>
  installed_packs!: Table<InstalledPackRecord, string>
  exports!: Table<ExportRecord, string>
  local_settings!: Table<LocalSettingsRecord, string>

  constructor() {
    super('videolab_pessoal')
    this.version(1).stores({
      projects: 'id, updated_at, title, format',
      project_versions: 'id, project_id, version_number, created_at',
      installed_packs: 'id, status, updated_at',
      exports: 'id, project_id, status, created_at',
      local_settings: 'id',
    })
  }
}

export const db = new VideoLabDatabase()
export const listProjects = () => db.projects.orderBy('updated_at').reverse().toArray()
export const saveProject = (record: ProjectRecord) => db.projects.put(record)
export const getProject = (id: string) => db.projects.get(id)
export const saveProjectVersion = (record: ProjectVersionRecord) => db.project_versions.put(record)

export async function deleteProject(id: string) {
  await db.transaction('rw', db.projects, db.project_versions, async () => {
    await db.projects.delete(id)
    await db.project_versions.where('project_id').equals(id).delete()
  })
}
