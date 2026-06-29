import { FileJson, FilePlus2, MessageSquareText, Music, PackageMinus, PackagePlus, Sparkles, Sticker, Subtitles } from 'lucide-react'
import { useRef } from 'react'
import { mockPacks } from '../../data/mockPacks'
import { Button } from '../ui/Button'
import { SelectInput } from '../ui/Field'
import { useEditorStore } from '../../modules/project/project.store'

const textPresets = ['Titulo cinematico', 'Legenda limpa', 'Credito final', 'Texto glitch', 'Lower third']
const templatePresets = ['Intro cinematico', 'Split screen', 'Montagem rapida', 'Vlog vertical', 'Mood board']
const effectPresets = [
  { id: 'brightness', type: 'brightness', name: 'Brilho', params: { amount: 1.1 } },
  { id: 'contrast', type: 'contrast', name: 'Contraste', params: { amount: 1.08 } },
  { id: 'saturation', type: 'saturation', name: 'Saturacao', params: { amount: 1.12 } },
  { id: 'bw', type: 'grayscale', name: 'Preto e branco', params: { amount: 1 } },
  { id: 'vignette', type: 'vignette', name: 'Vinheta', params: { amount: 0.35 } },
  { id: 'cinema', type: 'contrast', name: 'Cinema suave', params: { amount: 1.16 } },
  { id: 'dream', type: 'brightness', name: 'Sonho claro', params: { amount: 1.18 } },
  { id: 'neon', type: 'saturation', name: 'Neon vivo', params: { amount: 1.35 } },
]
const transitionPresets = [
  { id: 'fade', name: 'Fade', duration: 0.5 },
  { id: 'slide-left', name: 'Slide esquerda', duration: 0.6 },
  { id: 'zoom-in', name: 'Zoom in', duration: 0.5 },
  { id: 'flash', name: 'Flash', duration: 0.35 },
  { id: 'wipe', name: 'Wipe', duration: 0.6 },
]
const stickerPresets = ['PLAY', 'REC', 'VHS', '35MM', 'FOCO', 'LUZ', 'CUT']

export function ToolPanel() {
  const mediaRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)
  const captionsRef = useRef<HTMLInputElement>(null)
  const {
    activePanel,
    currentProject,
    exportSettings,
    importFiles,
    importProjectBackup,
    addTextClip,
    addCaption,
    exportCaptionsSrt,
    addStickerClip,
    importCaptionsSrt,
    applyEffectToSelected,
    addTransitionPreset,
    installedPackIds,
    installPack,
    removePack,
    lastError,
    updateExportSettings,
    goTo,
  } = useEditorStore()

  return (
    <aside className="media-panel tool-panel">
      <input accept="video/mp4,video/webm,image/png,image/jpeg,image/webp,audio/mpeg,audio/wav,audio/ogg" hidden multiple ref={mediaRef} type="file" onChange={(event) => event.target.files && void importFiles(event.target.files)} />
      <input accept="audio/mpeg,audio/wav,audio/ogg" hidden multiple ref={audioRef} type="file" onChange={(event) => event.target.files && void importFiles(event.target.files)} />
      <input accept="application/json,.json,.videolab.json" hidden ref={backupRef} type="file" onChange={(event) => event.target.files?.[0] && void importProjectBackup(event.target.files[0])} />
      <input accept=".srt,text/plain" hidden ref={captionsRef} type="file" onChange={(event) => event.target.files?.[0] && void importCaptionsSrt(event.target.files[0])} />
      {activePanel === 'media' ? (
        <>
          <PanelHeader title="Midia" description="Importe video, imagem, audio e backup de projeto." />
          <Button variant="primary" icon={<FilePlus2 size={18} />} onClick={() => mediaRef.current?.click()}>Importar midia</Button>
          <Button variant="secondary" icon={<FileJson size={18} />} onClick={() => backupRef.current?.click()}>Importar projeto</Button>
          <AssetList />
        </>
      ) : null}
      {activePanel === 'text' ? (
        <>
          <PanelHeader title="Texto" description="Adicione textos manuais editaveis no canvas." />
          <Button variant="primary" icon={<MessageSquareText size={18} />} onClick={addTextClip}>Adicionar texto</Button>
          <div className="tool-list">{textPresets.map((preset) => <button key={preset} type="button" onClick={addTextClip}>{preset}</button>)}</div>
        </>
      ) : null}
      {activePanel === 'templates' ? (
        <>
          <PanelHeader title="Templates" description="Modelos locais para iniciar composicoes rapidamente." />
          <div className="tool-list">{templatePresets.map((preset) => <button key={preset} type="button" onClick={addTextClip}>{preset}<small>Cria base editavel no projeto atual</small></button>)}</div>
        </>
      ) : null}
      {activePanel === 'effects' ? (
        <>
          <PanelHeader title="Efeitos" description="Aplique efeitos nao destrutivos ao clipe ativo." />
          <div className="tool-list">{effectPresets.map((effect) => <button key={effect.id} type="button" onClick={() => applyEffectToSelected(effect)}><Sparkles size={16} />{effect.name}</button>)}</div>
        </>
      ) : null}
      {activePanel === 'transitions' ? (
        <>
          <PanelHeader title="Transicoes" description="Salve transicoes no project_json para render futuro." />
          <div className="tool-list">{transitionPresets.map((transition) => <button key={transition.id} type="button" onClick={() => addTransitionPreset(transition)}>{transition.name}<small>{transition.duration}s</small></button>)}</div>
          <small className="muted">{currentProject?.transitions.length || 0} transicao(oes) no projeto.</small>
        </>
      ) : null}
      {activePanel === 'audio' ? (
        <>
          <PanelHeader title="Audio" description="Importe musicas e efeitos sonoros para a timeline." />
          <Button variant="primary" icon={<Music size={18} />} onClick={() => audioRef.current?.click()}>Importar audio</Button>
          <AssetList type="audio" />
        </>
      ) : null}
      {activePanel === 'stickers' ? (
        <>
          <PanelHeader title="Stickers" description="Adicione marcadores visuais editaveis." />
          <div className="tool-list">{stickerPresets.map((sticker) => <button key={sticker} type="button" onClick={() => addStickerClip(sticker)}><Sticker size={16} />{sticker}</button>)}</div>
        </>
      ) : null}
      {activePanel === 'captions' ? (
        <>
          <PanelHeader title="Legendas" description="Legendas manuais, sem transcricao por IA." />
          <Button variant="primary" icon={<Subtitles size={18} />} onClick={addCaption}>Adicionar legenda manual</Button>
          <Button variant="secondary" onClick={() => captionsRef.current?.click()}>Importar SRT</Button>
          <Button variant="secondary" onClick={exportCaptionsSrt}>Exportar SRT</Button>
          <small className="muted">{currentProject?.captions.length || 0} legenda(s) no projeto.</small>
        </>
      ) : null}
      {activePanel === 'packs' ? (
        <>
          <PanelHeader title="Pacotes" description="Instale/remova estilos visuais para uso offline." />
          <div className="tool-list">
            {mockPacks.map((pack) => {
              const installed = installedPackIds.includes(pack.id)
              return <button key={pack.id} type="button" onClick={() => void (installed ? removePack(pack.id) : installPack(pack.id))}>{installed ? <PackageMinus size={16} /> : <PackagePlus size={16} />}{pack.name}<small>{installed ? 'Instalado' : 'Disponivel'} - {pack.manifest.items.length} item(ns)</small></button>
            })}
          </div>
          <Button variant="secondary" onClick={() => goTo('packs')}>Ver tela completa</Button>
        </>
      ) : null}
      {activePanel === 'settings' ? (
        <>
          <PanelHeader title="Configuracoes" description="Ajustes rapidos de exportacao." />
          <label className="field"><span>Resolucao</span><SelectInput value={exportSettings.resolution} onChange={(event) => updateExportSettings({ resolution: event.target.value as typeof exportSettings.resolution })}><option value="720p">720p</option><option value="1080p">1080p</option><option value="1440p">2K</option><option value="2160p">4K</option></SelectInput></label>
          <label className="field"><span>Qualidade</span><SelectInput value={exportSettings.quality} onChange={(event) => updateExportSettings({ quality: event.target.value as typeof exportSettings.quality })}><option value="boa">Boa</option><option value="alta">Alta</option><option value="maxima">Maxima</option></SelectInput></label>
          <Button variant="secondary" onClick={() => goTo('settings')}>Ver configuracoes</Button>
        </>
      ) : null}
      {lastError ? <p className="panel-error">{lastError}</p> : null}
    </aside>
  )
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return <div className="panel-header"><strong>{title}</strong><small>{description}</small></div>
}

function AssetList({ type }: { type?: 'audio' }) {
  const currentProject = useEditorStore((state) => state.currentProject)
  const assets = currentProject?.assets.filter((asset) => !type || asset.type === type) || []
  return (
    <div className="asset-list">
      {assets.map((asset) => <div className="asset-item" key={asset.id}><span>{asset.type}</span><strong>{asset.name}</strong><small>{Math.round(asset.size / 1024)} KB</small></div>)}
      {!assets.length ? <p className="muted">Nenhum item encontrado.</p> : null}
    </div>
  )
}
