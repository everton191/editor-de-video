import { useState } from 'react'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, SelectInput } from '../components/ui/Field'
import { useEditorStore } from '../modules/project/project.store'
import { APP_VERSION_CODE, APP_VERSION_NAME, checkForAndroidUpdate, installAndroidUpdate, type UpdateManifest, type UpdateStatus } from '../modules/update/update.service'

export function SettingsPage() {
  const { goTo } = useEditorStore()
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle', message: 'Toque para verificar atualizacoes do APK.' })
  const [availableManifest, setAvailableManifest] = useState<UpdateManifest | null>(null)

  async function handleCheckUpdate() {
    setUpdateStatus({ state: 'checking', message: 'Verificando atualizacao...' })
    setAvailableManifest(null)
    try {
      const status = await checkForAndroidUpdate(false)
      setUpdateStatus(status)
      setAvailableManifest(status.state === 'available' && status.manifest ? status.manifest : null)
    } catch (error) {
      setUpdateStatus({ state: 'error', message: error instanceof Error ? error.message : 'Falha ao verificar atualizacao.' })
    }
  }

  async function handleInstallUpdate() {
    if (!availableManifest) return
    setUpdateStatus({ state: 'downloading', message: 'Baixando APK de atualizacao...', manifest: availableManifest })
    try {
      const status = await installAndroidUpdate(availableManifest)
      setUpdateStatus(status)
    } catch (error) {
      setUpdateStatus({ state: 'error', message: error instanceof Error ? error.message : 'Falha ao baixar atualizacao.', manifest: availableManifest })
    }
  }

  return (
    <main className="settings-page">
      <div className="page-top"><Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => goTo('editor')}>Voltar</Button><h1>Configuracoes</h1></div>
      <section className="settings-grid">
        <div className="form-card"><h2>Exportacao</h2><Field label="Resolucao padrao"><SelectInput defaultValue="1080p"><option>720p</option><option>1080p</option><option>2160p</option></SelectInput></Field><Field label="Qualidade padrao"><SelectInput defaultValue="alta"><option value="boa">Boa</option><option value="alta">Alta</option><option value="maxima">Maxima</option></SelectInput></Field></div>
        <div className="form-card"><h2>Renderizacao</h2><p className="muted">FFmpeg.wasm em worker para projetos pequenos com video e ate duas faixas de audio, com fallback para casos maiores.</p><label className="check-row"><input type="checkbox" defaultChecked /> Usar worker para tarefas pesadas</label></div>
        <div className="form-card"><h2>Atualizacao do APK</h2><p className="muted">Versao instalada {APP_VERSION_NAME} ({APP_VERSION_CODE}). {updateStatus.message}</p><div className="update-actions"><Button variant="secondary" icon={<RefreshCw size={18} />} onClick={() => void handleCheckUpdate()} disabled={updateStatus.state === 'checking' || updateStatus.state === 'downloading'}>Verificar</Button>{availableManifest ? <Button variant="primary" icon={<Download size={18} />} onClick={() => void handleInstallUpdate()} disabled={updateStatus.state === 'downloading'}>Instalar {availableManifest.versionName}</Button> : null}</div></div>
        <div className="form-card"><h2>Interface</h2><p className="muted">Idioma fixo em portugues. Tema escuro ativo para destacar o canvas.</p></div>
      </section>
    </main>
  )
}
