import { useEditorStore } from '../../modules/project/project.store'
import { Field, SelectInput, TextInput } from '../ui/Field'

export function PropertiesPanel() {
  const { currentProject, selectedClipId, updateClip } = useEditorStore()
  const clip = currentProject?.clips.find((item) => item.id === selectedClipId)
  if (!currentProject || !clip) return <aside className="properties-panel"><div className="panel-header"><strong>Propriedades</strong><small>Selecione um item.</small></div></aside>

  return (
    <aside className="properties-panel">
      <div className="panel-header"><strong>Propriedades</strong><small>{clip.type}</small></div>
      {clip.type === 'text' ? <Field label="Texto"><textarea className="input textarea" value={clip.text} onChange={(event) => updateClip(clip.id, { text: event.target.value })} /></Field> : null}
      <div className="property-grid">
        <Field label="Posicao X"><TextInput type="number" value={Math.round(clip.position.x)} onChange={(event) => updateClip(clip.id, { position: { ...clip.position, x: Number(event.target.value) } })} /></Field>
        <Field label="Posicao Y"><TextInput type="number" value={Math.round(clip.position.y)} onChange={(event) => updateClip(clip.id, { position: { ...clip.position, y: Number(event.target.value) } })} /></Field>
      </div>
      <Field label="Escala"><input className="slider" max="3" min="0.1" step="0.05" type="range" value={clip.scale} onChange={(event) => updateClip(clip.id, { scale: Number(event.target.value) })} /></Field>
      <Field label="Rotacao"><input className="slider" max="180" min="-180" step="1" type="range" value={clip.rotation} onChange={(event) => updateClip(clip.id, { rotation: Number(event.target.value) })} /></Field>
      <Field label="Opacidade"><input className="slider" max="1" min="0" step="0.01" type="range" value={clip.opacity} onChange={(event) => updateClip(clip.id, { opacity: Number(event.target.value) })} /></Field>
      <Field label="Duracao"><TextInput type="number" min="0.2" step="0.1" value={clip.duration} onChange={(event) => updateClip(clip.id, { duration: Number(event.target.value), trimEnd: Number(event.target.value) })} /></Field>
      {clip.type === 'audio' || clip.type === 'video' ? <Field label="Volume"><input className="slider" max="1" min="0" step="0.01" type="range" value={clip.volume} onChange={(event) => updateClip(clip.id, { volume: Number(event.target.value) })} /></Field> : null}
      {clip.type === 'audio' ? (
        <div className="property-grid">
          <Field label="Fade in"><TextInput type="number" min="0" max={clip.duration} step="0.1" value={Number(clip.metadata.fadeIn || 0)} onChange={(event) => updateClip(clip.id, { metadata: { ...clip.metadata, fadeIn: Number(event.target.value) } })} /></Field>
          <Field label="Fade out"><TextInput type="number" min="0" max={clip.duration} step="0.1" value={Number(clip.metadata.fadeOut || 0)} onChange={(event) => updateClip(clip.id, { metadata: { ...clip.metadata, fadeOut: Number(event.target.value) } })} /></Field>
        </div>
      ) : null}
      {clip.effects.length ? (
        <div className="form-card compact-card">
          <h2>Efeitos</h2>
          {clip.effects.map((effect) => (
            <div className="effect-control" key={effect.id}>
              <label className="check-row"><input checked={effect.enabled} type="checkbox" onChange={(event) => updateClip(clip.id, { effects: clip.effects.map((item) => item.id === effect.id ? { ...item, enabled: event.target.checked } : item) })} /> <span>{effect.name}</span></label>
              {effect.type !== 'vignette' ? <input className="slider" max="2" min="0" step="0.01" type="range" value={Number(effect.params.amount || 1)} onChange={(event) => updateClip(clip.id, { effects: clip.effects.map((item) => item.id === effect.id ? { ...item, params: { ...item.params, amount: Number(event.target.value) } } : item) })} /> : null}
              <button className="button button--ghost" type="button" onClick={() => updateClip(clip.id, { effects: clip.effects.filter((item) => item.id !== effect.id) })}>Remover</button>
            </div>
          ))}
        </div>
      ) : null}
      {clip.type === 'text' && clip.style ? (
        <>
          <Field label="Tamanho"><TextInput type="number" value={clip.style.fontSize} onChange={(event) => updateClip(clip.id, { style: { ...clip.style!, fontSize: Number(event.target.value) } })} /></Field>
          <Field label="Cor"><TextInput type="color" value={clip.style.color} onChange={(event) => updateClip(clip.id, { style: { ...clip.style!, color: event.target.value } })} /></Field>
          <Field label="Alinhamento"><SelectInput value={clip.style.align} onChange={(event) => updateClip(clip.id, { style: { ...clip.style!, align: event.target.value as 'left' | 'center' | 'right' } })}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></SelectInput></Field>
        </>
      ) : null}
    </aside>
  )
}
