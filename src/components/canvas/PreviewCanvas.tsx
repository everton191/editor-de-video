import { Pause, Play } from 'lucide-react'
import { useEffect } from 'react'
import { getVisibleClipsAtTime } from '../../modules/canvas/canvas.engine'
import { useEditorStore } from '../../modules/project/project.store'
import { Button } from '../ui/Button'

export function PreviewCanvas() {
  const { currentProject, currentTime, isPlaying, selectedClipId, selectClip, togglePlayback, setCurrentTime, updateClip } = useEditorStore()

  useEffect(() => {
    if (!isPlaying || !currentProject) return
    const timer = window.setInterval(() => setCurrentTime(currentTime + 0.1 >= currentProject.duration ? 0 : currentTime + 0.1), 100)
    return () => window.clearInterval(timer)
  }, [currentTime, currentProject, isPlaying, setCurrentTime])

  if (!currentProject) return null
  const visibleClips = getVisibleClipsAtTime(currentProject, currentTime)

  return (
    <section className="preview-panel">
      <div className="preview-stage" style={{ aspectRatio: `${currentProject.width} / ${currentProject.height}`, background: currentProject.background }}>
        {visibleClips.map((clip) => {
          const asset = currentProject.assets.find((item) => item.id === clip.assetId)
          const left = `${(clip.position.x / currentProject.width) * 100}%`
          const top = `${(clip.position.y / currentProject.height) * 100}%`
          const width = `${(clip.size.width / currentProject.width) * 100}%`
          const selectedClass = selectedClipId === clip.id ? 'is-selected' : ''
          if (clip.type === 'text') {
            return (
              <div
                className={`canvas-object canvas-object--text ${selectedClass}`}
                key={clip.id}
                role="button"
                tabIndex={0}
                style={{
                  left,
                  top,
                  width,
                  opacity: clip.opacity,
                  transform: `translate(-50%, -50%) scale(${clip.scale}) rotate(${clip.rotation}deg)`,
                  color: clip.style?.color,
                  fontSize: `${clip.style?.fontSize || 64}px`,
                  fontWeight: clip.style?.fontWeight,
                  textAlign: clip.style?.align,
                }}
                onClick={() => selectClip(clip.id)}
                onPointerMove={(event) => {
                  if (!(event.buttons & 1)) return
                  const stage = event.currentTarget.closest('.preview-stage')?.getBoundingClientRect()
                  if (!stage) return
                  updateClip(clip.id, {
                    position: {
                      x: ((event.clientX - stage.left) / stage.width) * currentProject.width,
                      y: ((event.clientY - stage.top) / stage.height) * currentProject.height,
                    },
                  })
                }}
              >
                {clip.text}
              </div>
            )
          }
          if (asset?.type === 'image') {
            return <img className={`canvas-object canvas-object--media ${selectedClass}`} key={clip.id} src={asset.src} alt={asset.name} style={{ left, top, width, opacity: clip.opacity, transform: `translate(-50%, -50%) scale(${clip.scale}) rotate(${clip.rotation}deg)` }} onClick={() => selectClip(clip.id)} />
          }
          if (asset?.type === 'video') {
            return <video className={`canvas-object canvas-object--video ${selectedClass}`} key={clip.id} src={asset.src} muted playsInline style={{ left: '50%', top: '50%', width: '100%', opacity: clip.opacity, transform: `translate(-50%, -50%) scale(${clip.scale}) rotate(${clip.rotation}deg)` }} onClick={() => selectClip(clip.id)} />
          }
          return null
        })}
        {!visibleClips.length ? <div className="preview-empty"><strong>Importe midia ou adicione texto</strong><span>O preview mostra os elementos ativos no tempo atual.</span></div> : null}
      </div>
      <div className="preview-controls">
        <Button variant="ghost" icon={isPlaying ? <Pause size={20} /> : <Play size={20} />} onClick={togglePlayback}>{isPlaying ? 'Pausar' : 'Play'}</Button>
        <span>{currentTime.toFixed(2)}s / {currentProject.duration.toFixed(2)}s</span>
        <input aria-label="Tempo atual" max={currentProject.duration} min={0} step={0.01} type="range" value={currentTime} onChange={(event) => setCurrentTime(Number(event.target.value))} />
      </div>
    </section>
  )
}
