import { Captions, Clapperboard, DownloadCloud, Image, Music, Package, Settings, Sparkles, Sticker, Text, Wand } from 'lucide-react'
import { useEditorStore } from '../../modules/project/project.store'

const items = [
  { id: 'media', label: 'Midia', icon: Image },
  { id: 'text', label: 'Texto', icon: Text },
  { id: 'templates', label: 'Templates', icon: Clapperboard },
  { id: 'effects', label: 'Efeitos', icon: Sparkles },
  { id: 'transitions', label: 'Transicoes', icon: Wand },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'stickers', label: 'Stickers', icon: Sticker },
  { id: 'captions', label: 'Legendas', icon: Captions },
  { id: 'packs', label: 'Pacotes', icon: Package },
  { id: 'settings', label: 'Config.', icon: Settings },
]

export function LeftSidebar() {
  const { goTo } = useEditorStore()
  return (
    <aside className="sidebar">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button className="sidebar__item" key={item.id} type="button" title={item.label} onClick={() => {
            if (item.id === 'packs') goTo('packs')
            if (item.id === 'settings') goTo('settings')
          }}>
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        )
      })}
      <button className="sidebar__item sidebar__export" type="button" onClick={() => goTo('export')}>
        <DownloadCloud size={20} />
        <span>Exportar</span>
      </button>
    </aside>
  )
}
