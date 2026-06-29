import { Copy, Scissors, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { useEditorStore } from '../../modules/project/project.store'
import { formatTime } from '../../utils/time'
import { Button } from '../ui/Button'

export function Timeline() {
  const { currentProject, currentTime, selectedClipId, selectClip, setCurrentTime, updateClip, splitSelectedClip, duplicateSelectedClip, deleteSelectedClip } = useEditorStore()
  if (!currentProject) return null
  const pixelsPerSecond = 84 * currentProject.globalSettings.timelineZoom
  const width = Math.max(720, currentProject.duration * pixelsPerSecond + 160)

  return (
    <section className="timeline-panel">
      <div className="timeline-toolbar">
        <div><strong>Timeline</strong><small>{formatTime(currentTime)}</small></div>
        <div className="timeline-toolbar__actions">
          <Button variant="ghost" icon={<Scissors size={18} />} onClick={splitSelectedClip}>Dividir</Button>
          <Button variant="ghost" icon={<Copy size={18} />} onClick={duplicateSelectedClip}>Duplicar</Button>
          <Button variant="danger" icon={<Trash2 size={18} />} onClick={deleteSelectedClip}>Excluir</Button>
          <Button variant="ghost" icon={<ZoomOut size={18} />} aria-label="Menos zoom" />
          <Button variant="ghost" icon={<ZoomIn size={18} />} aria-label="Mais zoom" />
        </div>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-ruler" style={{ width }} onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()
          setCurrentTime((event.clientX - bounds.left - 120) / pixelsPerSecond)
        }}>
          <div className="timeline-playhead" style={{ left: 120 + currentTime * pixelsPerSecond }} />
          {Array.from({ length: Math.ceil(currentProject.duration) + 1 }).map((_, second) => <span key={second} style={{ left: 120 + second * pixelsPerSecond }}>{second}s</span>)}
        </div>
        <div className="timeline-tracks" style={{ width }}>
          {currentProject.tracks.map((track) => (
            <div className="timeline-track" key={track.id} style={{ height: track.height }}>
              <div className="timeline-track__label"><strong>{track.name}</strong><small>{track.type}</small></div>
              {currentProject.clips.filter((clip) => clip.trackId === track.id).map((clip) => {
                const asset = currentProject.assets.find((item) => item.id === clip.assetId)
                return (
                  <button
                    className={`timeline-clip timeline-clip--${clip.type} ${selectedClipId === clip.id ? 'is-selected' : ''}`}
                    key={clip.id}
                    type="button"
                    style={{ left: 120 + clip.start * pixelsPerSecond, width: Math.max(56, clip.duration * pixelsPerSecond) }}
                    onClick={() => selectClip(clip.id)}
                    onDoubleClick={() => updateClip(clip.id, { duration: Math.max(0.5, clip.duration - 0.5), trimEnd: Math.max(0.5, clip.duration - 0.5) })}
                    draggable
                    onDragEnd={(event) => {
                      const parent = event.currentTarget.parentElement?.getBoundingClientRect()
                      if (!parent) return
                      updateClip(clip.id, { start: Math.max(0, (event.clientX - parent.left - 120) / pixelsPerSecond) })
                    }}
                  >
                    <span>{clip.text || asset?.name || clip.type}</span>
                    <small>{clip.duration.toFixed(1)}s</small>
                  </button>
                )
              })}
            </div>
          ))}
          {currentProject.captions.map((caption) => <div className="timeline-caption" key={caption.id} style={{ left: 120 + caption.start * pixelsPerSecond, width: caption.duration * pixelsPerSecond }}>{caption.text}</div>)}
        </div>
      </div>
    </section>
  )
}
