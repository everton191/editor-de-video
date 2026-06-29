import { ArrowLeft, Download, Eye, Redo2, Save, Undo2 } from 'lucide-react'
import { useEditorStore } from '../../modules/project/project.store'
import { formatTime } from '../../utils/time'
import { Button } from '../ui/Button'

export function Topbar() {
  const { currentProject, saveStatus, goTo, saveCurrentProject } = useEditorStore()
  if (!currentProject) return null
  return (
    <header className="topbar">
      <div className="topbar__left">
        <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => goTo('home')} aria-label="Voltar" />
        <div>
          <strong>{currentProject.title}</strong>
          <small>{currentProject.format} · {formatTime(currentProject.duration)} · {saveStatus}</small>
        </div>
      </div>
      <div className="topbar__actions">
        <Button variant="ghost" icon={<Undo2 size={18} />} aria-label="Desfazer" />
        <Button variant="ghost" icon={<Redo2 size={18} />} aria-label="Refazer" />
        <Button variant="secondary" icon={<Eye size={18} />}>Visualizar</Button>
        <Button variant="secondary" icon={<Save size={18} />} onClick={() => void saveCurrentProject(true)}>Salvar</Button>
        <Button variant="primary" icon={<Download size={18} />} onClick={() => goTo('export')}>Exportar</Button>
      </div>
    </header>
  )
}
