import { FileJson, FilePlus2, MessageSquareText, Subtitles } from 'lucide-react'
import { useRef } from 'react'
import { useEditorStore } from '../../modules/project/project.store'
import { Button } from '../ui/Button'

export function MediaPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)
  const { currentProject, importFiles, importProjectBackup, addTextClip, addCaption, lastError } = useEditorStore()
  return (
    <aside className="media-panel">
      <div className="panel-header"><strong>Midia e criacao</strong><small>Arquivos ficam no projeto local.</small></div>
      <input accept="video/mp4,video/webm,image/png,image/jpeg,image/webp,audio/mpeg,audio/wav,audio/ogg" hidden multiple ref={inputRef} type="file" onChange={(event) => event.target.files && void importFiles(event.target.files)} />
      <input accept="application/json,.json,.videolab.json" hidden ref={backupRef} type="file" onChange={(event) => event.target.files?.[0] && void importProjectBackup(event.target.files[0])} />
      <Button variant="primary" icon={<FilePlus2 size={18} />} onClick={() => inputRef.current?.click()}>Importar midia</Button>
      <Button variant="secondary" icon={<FileJson size={18} />} onClick={() => backupRef.current?.click()}>Importar projeto</Button>
      <Button variant="secondary" icon={<MessageSquareText size={18} />} onClick={addTextClip}>Adicionar texto</Button>
      <Button variant="secondary" icon={<Subtitles size={18} />} onClick={addCaption}>Legenda manual</Button>
      {lastError ? <p className="panel-error">{lastError}</p> : null}
      <div className="asset-list">
        {currentProject?.assets.map((asset) => <div className="asset-item" key={asset.id}><span>{asset.type}</span><strong>{asset.name}</strong><small>{Math.round(asset.size / 1024)} KB</small></div>)}
        {!currentProject?.assets.length ? <p className="muted">Nenhuma midia importada ainda.</p> : null}
      </div>
    </aside>
  )
}
