import { ArrowLeft, Download, FileVideo2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, SelectInput } from '../components/ui/Field'
import { exportPresets, useEditorStore } from '../modules/project/project.store'

export function ExportPage() {
  const {
    currentProject,
    goTo,
    exportSettings,
    updateExportSettings,
    getExportPlan,
    renderCurrentProject,
    cancelRender,
    isRendering,
    renderProgress,
    renderStatus,
    lastError,
  } = useEditorStore()
  const plan = getExportPlan()
  if (!currentProject) return null
  return (
    <main className="export-page">
      <div className="page-top"><Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => goTo('editor')}>Voltar</Button><h1>Exportar video</h1></div>
      <section className="export-layout">
        <div className="form-card">
          <Field label="Resolucao"><SelectInput value={exportSettings.resolution} onChange={(event) => updateExportSettings({ resolution: event.target.value as typeof exportSettings.resolution })}><option value="original">Original</option><option value="720p">720p</option><option value="1080p">1080p</option><option value="1440p">1440p / 2K</option><option value="2160p">2160p / 4K</option><option value="custom">Personalizada</option></SelectInput></Field>
          <Field label="FPS"><SelectInput value={exportSettings.fps} onChange={(event) => updateExportSettings({ fps: event.target.value === 'original' ? 'original' : Number(event.target.value) as 24 | 30 | 60 })}><option value="original">Manter original</option><option value={24}>24</option><option value={30}>30</option><option value={60}>60</option></SelectInput></Field>
          <Field label="Qualidade"><SelectInput value={exportSettings.quality} onChange={(event) => updateExportSettings({ quality: event.target.value as typeof exportSettings.quality })}><option value="leve">Leve</option><option value="boa">Boa</option><option value="alta">Alta</option><option value="maxima">Maxima</option></SelectInput></Field>
          <label className="check-row"><input checked={exportSettings.improveQuality} type="checkbox" onChange={(event) => updateExportSettings({ improveQuality: event.target.checked })} /><span>Melhorar Qualidade</span></label>
          <p className="notice">Esta melhoria usa processamento tradicional. Ela pode aumentar a resolucao e melhorar a aparencia, mas nao cria detalhes reais que nao existem no video original.</p>
          <div className="check-grid"><label><input checked={exportSettings.sharpen} type="checkbox" onChange={(event) => updateExportSettings({ sharpen: event.target.checked })} /> Nitidez</label><label><input checked={exportSettings.denoise} type="checkbox" onChange={(event) => updateExportSettings({ denoise: event.target.checked })} /> Reduzir ruido</label><label><input checked={exportSettings.improveContrast} type="checkbox" onChange={(event) => updateExportSettings({ improveContrast: event.target.checked })} /> Contraste</label><label><input checked={exportSettings.improveSaturation} type="checkbox" onChange={(event) => updateExportSettings({ improveSaturation: event.target.checked })} /> Saturacao</label></div>
          <Button variant="primary" icon={<Download size={18} />} disabled={isRendering} onClick={() => void renderCurrentProject()}>
            {isRendering ? 'Exportando...' : 'Exportar agora'}
          </Button>
          {isRendering ? <Button variant="danger" onClick={cancelRender}>Cancelar exportacao</Button> : null}
          <div className="render-progress" aria-label="Progresso da exportacao">
            <span style={{ width: `${renderProgress}%` }} />
          </div>
          <small className="muted">{renderStatus}</small>
          {lastError ? <p className="panel-error">{lastError}</p> : null}
        </div>
        <div className="preset-column"><h2>Presets</h2>{exportPresets.map((preset) => <button className="preset-card" key={preset.id} type="button" onClick={() => updateExportSettings(preset.settings)}><FileVideo2 size={20} /><strong>{preset.name}</strong><span>{preset.description}</span></button>)}</div>
        <div className="plan-card"><h2>Plano FFmpeg</h2><pre>{JSON.stringify(plan, null, 2)}</pre></div>
      </section>
    </main>
  )
}
