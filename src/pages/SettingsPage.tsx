import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, SelectInput } from '../components/ui/Field'
import { useEditorStore } from '../modules/project/project.store'

export function SettingsPage() {
  const { goTo } = useEditorStore()
  return (
    <main className="settings-page">
      <div className="page-top"><Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => goTo('editor')}>Voltar</Button><h1>Configuracoes</h1></div>
      <section className="settings-grid">
        <div className="form-card"><h2>Exportacao</h2><Field label="Resolucao padrao"><SelectInput defaultValue="1080p"><option>720p</option><option>1080p</option><option>2160p</option></SelectInput></Field><Field label="Qualidade padrao"><SelectInput defaultValue="alta"><option value="boa">Boa</option><option value="alta">Alta</option><option value="maxima">Maxima</option></SelectInput></Field></div>
        <div className="form-card"><h2>Renderizacao</h2><p className="muted">FFmpeg.wasm em worker para projetos pequenos com video e ate duas faixas de audio, com fallback para casos maiores.</p><label className="check-row"><input type="checkbox" defaultChecked /> Usar worker para tarefas pesadas</label></div>
        <div className="form-card"><h2>Interface</h2><p className="muted">Idioma fixo em portugues. Tema escuro ativo para destacar o canvas.</p></div>
      </section>
    </main>
  )
}
