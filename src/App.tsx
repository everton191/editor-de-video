import { useEffect } from 'react'
import { EditorPage } from './pages/EditorPage'
import { ExportPage } from './pages/ExportPage'
import { HomePage } from './pages/HomePage'
import { NewProjectPage } from './pages/NewProjectPage'
import { PacksPage } from './pages/PacksPage'
import { SettingsPage } from './pages/SettingsPage'
import { useEditorStore } from './modules/project/project.store'
import { checkForAndroidUpdate } from './modules/update/update.service'

function App() {
  const view = useEditorStore((state) => state.view)

  useEffect(() => {
    checkForAndroidUpdate(true).catch((error) => {
      console.warn('Falha na verificacao automatica de atualizacao.', error)
    })
  }, [])

  if (view === 'new-project') return <NewProjectPage />
  if (view === 'editor') return <EditorPage />
  if (view === 'export') return <ExportPage />
  if (view === 'packs') return <PacksPage />
  if (view === 'settings') return <SettingsPage />
  return <HomePage />
}

export default App
