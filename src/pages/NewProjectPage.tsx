import { ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Field, SelectInput, TextInput } from '../components/ui/Field'
import { PROJECT_FORMATS } from '../modules/project/project.engine'
import { useEditorStore } from '../modules/project/project.store'
import type { VideoFormat } from '../modules/project/project.types'

export function NewProjectPage() {
  const { createNewProject, goTo } = useEditorStore()
  const [title, setTitle] = useState('Meu Projeto 01')
  const [format, setFormat] = useState<VideoFormat>('9:16')
  const [width, setWidth] = useState(1080)
  const [height, setHeight] = useState(1920)
  const [fps, setFps] = useState(30)
  return (
    <main className="new-project-page">
      <div className="page-top"><Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => goTo('home')}>Voltar</Button><h1>Novo projeto</h1></div>
      <section className="new-project-layout">
        <form className="form-card" onSubmit={(event) => { event.preventDefault(); void createNewProject({ title, format, width, height, fps }) }}>
          <Field label="Nome do projeto"><TextInput value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
          <Field label="Formato"><SelectInput value={format} onChange={(event) => setFormat(event.target.value as VideoFormat)}>{Object.entries(PROJECT_FORMATS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</SelectInput></Field>
          {format === 'custom' ? <div className="property-grid"><Field label="Largura"><TextInput type="number" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></Field><Field label="Altura"><TextInput type="number" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></Field></div> : null}
          <Field label="FPS"><SelectInput value={fps} onChange={(event) => setFps(Number(event.target.value))}><option value={24}>24 FPS</option><option value={30}>30 FPS</option><option value={60}>60 FPS</option></SelectInput></Field>
          <Button type="submit" variant="primary" icon={<Check size={18} />}>Criar em branco</Button>
        </form>
        <div className="format-grid">{Object.entries(PROJECT_FORMATS).map(([key, item]) => <button className={`format-card ${format === key ? 'is-selected' : ''}`} key={key} type="button" onClick={() => { setFormat(key as VideoFormat); setWidth(item.width); setHeight(item.height) }}><strong>{item.label}</strong><span>{item.width}x{item.height}</span><small>{item.description}</small></button>)}</div>
      </section>
    </main>
  )
}
