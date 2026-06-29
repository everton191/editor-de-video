import { useEffect } from 'react'
import { PreviewCanvas } from '../components/canvas/PreviewCanvas'
import { LeftSidebar } from '../components/layout/LeftSidebar'
import { Topbar } from '../components/layout/Topbar'
import { MediaPanel } from '../components/panels/MediaPanel'
import { PropertiesPanel } from '../components/panels/PropertiesPanel'
import { Timeline } from '../components/timeline/Timeline'
import { useEditorStore } from '../modules/project/project.store'

export function EditorPage() {
  const { currentProject, saveStatus, goTo, saveCurrentProject, togglePlayback, splitSelectedClip, deleteSelectedClip, duplicateSelectedClip } = useEditorStore()
  useEffect(() => { if (!currentProject) goTo('home') }, [currentProject, goTo])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void saveCurrentProject(true) }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelectedClip() }
      if (event.key === ' ') { event.preventDefault(); togglePlayback() }
      if (event.key === 'Delete') deleteSelectedClip()
      if (event.key.toLowerCase() === 's' && !event.ctrlKey && !event.metaKey) splitSelectedClip()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelectedClip, duplicateSelectedClip, saveCurrentProject, splitSelectedClip, togglePlayback])
  useEffect(() => {
    if (saveStatus !== 'alterado') return
    const timer = window.setTimeout(() => void saveCurrentProject(false), 1200)
    return () => window.clearTimeout(timer)
  }, [saveCurrentProject, saveStatus])
  if (!currentProject) return null
  return <main className="editor-page"><Topbar /><div className="editor-shell"><LeftSidebar /><MediaPanel /><div className="editor-center"><PreviewCanvas /><Timeline /></div><PropertiesPanel /></div></main>
}
