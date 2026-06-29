import { Copy, FolderOpen, Package, Play, Plus, Settings, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '../components/ui/Button'
import { useEditorStore } from '../modules/project/project.store'
import { formatTime } from '../utils/time'

export function HomePage() {
  const backupRef = useRef<HTMLInputElement>(null)
  const { projects, refreshProjects, goTo, openProject, duplicateProject, removeProject, importProjectBackup } = useEditorStore()
  useEffect(() => { void refreshProjects() }, [refreshProjects])
  return (
    <main className="home-page">
      <section className="home-hero">
        <div><span className="eyebrow">VideoLab Pessoal</span><h1>Editor de videos local-first para uso pessoal</h1><p>Crie projetos, importe midia, edite textos no canvas, organize clipes na timeline e prepare exportacao sem login, sem planos pagos e sem IA.</p></div>
        <div className="hero-actions">
          <input accept="application/json,.json,.videolab.json" hidden ref={backupRef} type="file" onChange={(event) => event.target.files?.[0] && void importProjectBackup(event.target.files[0])} />
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => goTo('new-project')}>Novo projeto</Button>
          <Button variant="secondary" icon={<FolderOpen size={18} />} onClick={() => backupRef.current?.click()}>Abrir projeto</Button>
        </div>
      </section>
      <section className="quick-grid">
        <button className="quick-card" type="button" onClick={() => goTo('packs')}><Package size={24} /><strong>Pacotes</strong><span>Efeitos e templates mockados.</span></button>
        <button className="quick-card" type="button" onClick={() => goTo('settings')}><Settings size={24} /><strong>Configuracoes</strong><span>Qualidade, tema e renderizacao.</span></button>
        <button className="quick-card" type="button"><Upload size={24} /><strong>Backup futuro</strong><span>Estrutura preparada.</span></button>
      </section>
      <section className="projects-section">
        <div className="section-title"><div><h2>Projetos recentes</h2><p>Salvos no IndexedDB deste navegador.</p></div></div>
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <button className="project-main" type="button" onClick={() => void openProject(project.id)}>
                <span className="project-thumb">{project.format}</span>
                <span className="project-card__body project-card__open">
                  <strong>{project.title}</strong><small>{project.width}x{project.height} · {project.fps} FPS · {formatTime(project.duration)}</small><small>Atualizado em {new Date(project.updated_at).toLocaleString('pt-BR')}</small>
                </span>
              </button>
              <div className="project-card__actions"><Button variant="secondary" icon={<Play size={16} />} onClick={() => void openProject(project.id)}>Abrir</Button><Button variant="ghost" icon={<Copy size={16} />} onClick={() => void duplicateProject(project.id)} aria-label="Duplicar" /><Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void removeProject(project.id)} aria-label="Excluir" /></div>
            </article>
          ))}
          {!projects.length ? <div className="empty-state">Nenhum projeto salvo ainda. Comece por “Novo projeto”.</div> : null}
        </div>
      </section>
    </main>
  )
}
