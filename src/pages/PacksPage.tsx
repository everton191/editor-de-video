import { ArrowLeft, Check, PackageMinus, PackagePlus } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { mockPacks } from '../data/mockPacks'
import { validatePackManifest } from '../modules/packs/manifest.validator'
import { useEditorStore } from '../modules/project/project.store'

export function PacksPage() {
  const { installedPackIds, installedPackItemCount, installPack, removePack, refreshInstalledPacks, goTo } = useEditorStore()
  useEffect(() => {
    void refreshInstalledPacks()
  }, [refreshInstalledPacks])
  return (
    <main className="packs-page">
      <div className="page-top"><Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => goTo('editor')}>Voltar</Button><h1>Pacotes</h1></div>
      <div className="pack-summary">
        <strong>{installedPackIds.length} pacote(s) instalado(s)</strong>
        <span>{installedPackItemCount} item(ns) de efeito/template disponiveis offline.</span>
      </div>
      <div className="pack-grid">{mockPacks.map((pack) => {
        const installed = installedPackIds.includes(pack.id)
        const validation = validatePackManifest(pack.manifest)
        return <article className="pack-card" key={pack.id}><div className="pack-cover">{pack.category}</div><div><strong>{pack.name}</strong><p>{pack.manifest.description}</p><small>{pack.size} · v{pack.version} · {pack.author}</small><small>{validation.valid ? 'Manifest validado' : validation.error}</small></div>{installed ? <div className="pack-items"><strong>Midias/itens baixados</strong>{pack.manifest.items.map((item) => <span key={item.id}>{item.type}: {item.name}</span>)}</div> : null}<Button variant={installed ? 'danger' : 'primary'} icon={installed ? <PackageMinus size={18} /> : <PackagePlus size={18} />} onClick={() => void (installed ? removePack(pack.id) : installPack(pack.id))}>{installed ? 'Remover' : 'Instalar'}</Button>{installed ? <span className="installed-badge"><Check size={14} /> instalado</span> : null}</article>
      })}</div>
    </main>
  )
}
