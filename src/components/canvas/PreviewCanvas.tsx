import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, type CSSProperties } from 'react'
import { getVisibleClipsAtTime } from '../../modules/canvas/canvas.engine'
import { useEditorStore } from '../../modules/project/project.store'
import type { EditorAsset, ProjectJson, TimelineClip } from '../../modules/project/project.types'
import { Button } from '../ui/Button'

export function PreviewCanvas() {
  const { currentProject, currentTime, isPlaying, selectedClipId, selectClip, togglePlayback, setCurrentTime, updateClip } = useEditorStore()

  useEffect(() => {
    if (!isPlaying || !currentProject) return
    if (currentProject.duration <= 0) return
    const timer = window.setInterval(() => setCurrentTime(currentTime + 0.1 >= currentProject.duration ? 0 : currentTime + 0.1), 100)
    return () => window.clearInterval(timer)
  }, [currentTime, currentProject, isPlaying, setCurrentTime])

  if (!currentProject) return null
  const visibleClips = getVisibleClipsAtTime(currentProject, currentTime)
  const visibleCaptions = currentProject.captions.filter((caption) => currentTime >= caption.start && currentTime <= caption.start + caption.duration)

  return (
    <section className="preview-panel">
      <div className="preview-stage" style={{ '--project-ratio': currentProject.width / currentProject.height, aspectRatio: `${currentProject.width} / ${currentProject.height}`, background: currentProject.background } as CSSProperties}>
        {visibleClips.map((clip) => {
          const asset = currentProject.assets.find((item) => item.id === clip.assetId)
          const left = `${(clip.position.x / currentProject.width) * 100}%`
          const top = `${(clip.position.y / currentProject.height) * 100}%`
          const width = `${(clip.size.width / currentProject.width) * 100}%`
          const height = `${(clip.size.height / currentProject.height) * 100}%`
          const selectedClass = selectedClipId === clip.id ? 'is-selected' : ''
          const transitionStyle = previewTransitionStyle(currentProject, clip, currentTime)
          const mediaClassName = `canvas-object ${hasVignette(clip) ? 'has-vignette' : ''} ${hasGlow(clip) ? 'has-glow' : ''} ${selectedClass}`
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
                  minHeight: height,
                  opacity: clip.opacity,
                  transform: `translate(-50%, -50%) scale(${clip.scale}) rotate(${clip.rotation}deg)`,
                  filter: previewFilter(clip),
                  color: clip.style?.color,
                  fontSize: `${clip.style?.fontSize || 64}px`,
                  fontWeight: clip.style?.fontWeight,
                  textAlign: clip.style?.align,
                  background: clip.style?.backgroundColor,
                  WebkitTextStroke: clip.style?.strokeWidth ? `${clip.style.strokeWidth}px ${clip.style.strokeColor}` : undefined,
                  ...transitionStyle,
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
            return <img className={`${mediaClassName} canvas-object--media`} key={clip.id} src={asset.src} alt={asset.name} style={{ left, top, width, height, opacity: clip.opacity, filter: previewFilter(clip), transform: `translate(-50%, -50%) scale(${clip.scale}) rotate(${clip.rotation}deg)`, ...transitionStyle }} onClick={() => selectClip(clip.id)} />
          }
          if (asset?.type === 'video') {
            return <PreviewVideoClip asset={asset} className={`${mediaClassName} canvas-object--video`} clip={clip} currentTime={currentTime} isPlaying={isPlaying} key={clip.id} style={{ left, top, width, height, opacity: clip.opacity, filter: previewFilter(clip), transform: `translate(-50%, -50%) scale(${clip.scale}) rotate(${clip.rotation}deg)`, ...transitionStyle }} onSelect={() => selectClip(clip.id)} />
          }
          return null
        })}
        {visibleCaptions.map((caption) => <div className={`preview-caption preview-caption--${caption.style.position}`} key={caption.id} style={{ color: caption.style.color, background: caption.style.backgroundColor, fontFamily: caption.style.fontFamily, fontSize: caption.style.fontSize, fontWeight: caption.style.fontWeight, textAlign: caption.style.align }}>{caption.text}</div>)}
        {!visibleClips.length ? <div className="preview-empty"><strong>Importe midia ou adicione texto</strong><span>O preview mostra os elementos ativos no tempo atual.</span></div> : null}
      </div>
      <div className="preview-controls">
        <Button variant="ghost" icon={isPlaying ? <Pause size={20} /> : <Play size={20} />} onClick={togglePlayback}>{isPlaying ? 'Pausar' : 'Play'}</Button>
        <span>{currentTime.toFixed(2)}s / {currentProject.duration.toFixed(2)}s</span>
        <input aria-label="Tempo atual" disabled={currentProject.duration <= 0} max={Math.max(0.01, currentProject.duration)} min={0} step={0.01} type="range" value={Math.min(currentTime, Math.max(0, currentProject.duration))} onChange={(event) => setCurrentTime(Number(event.target.value))} />
      </div>
    </section>
  )
}

function PreviewVideoClip({ asset, className, clip, currentTime, isPlaying, onSelect, style }: { asset: EditorAsset; className: string; clip: TimelineClip; currentTime: number; isPlaying: boolean; onSelect: () => void; style: CSSProperties }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const clipTime = Math.max(0, Math.min(clip.trimEnd, clip.trimStart + currentTime - clip.start))
    if (Number.isFinite(clipTime) && Math.abs(video.currentTime - clipTime) > 0.2) {
      try {
        video.currentTime = clipTime
      } catch {
        // The browser can reject seeks before metadata is loaded.
      }
    }
    if (isPlaying) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [clip.start, clip.trimEnd, clip.trimStart, currentTime, isPlaying])

  return <video className={className} muted playsInline preload="auto" ref={videoRef} src={asset.src} style={style} onClick={onSelect} />
}

function previewFilter(clip: { effects: Array<{ type: string; enabled: boolean; params: Record<string, number | string | boolean> }> }) {
  const filters: string[] = []
  for (const effect of clip.effects.filter((item) => item.enabled)) {
    if (effect.type === 'brightness') filters.push(`brightness(${Number(effect.params.amount || 1.1)})`)
    if (effect.type === 'contrast') filters.push(`contrast(${Number(effect.params.amount || 1.08)})`)
    if (effect.type === 'saturation') filters.push(`saturate(${Number(effect.params.amount || 1.12)})`)
    if (effect.type === 'grayscale') filters.push(`grayscale(${Number(effect.params.amount || 1)})`)
    if (effect.type === 'cinema') filters.push(`contrast(${Number(effect.params.contrast || 1.16)}) saturate(${Number(effect.params.saturation || 0.92)}) brightness(${Number(effect.params.brightness || 0.96)})`)
    if (effect.type === 'dream') filters.push(`brightness(${Number(effect.params.brightness || 1.16)}) saturate(${Number(effect.params.saturation || 1.08)}) blur(${Number(effect.params.blur || 0.4)}px)`)
    if (effect.type === 'neon') filters.push(`saturate(${Number(effect.params.saturation || 1.45)}) contrast(${Number(effect.params.contrast || 1.14)}) drop-shadow(0 0 16px rgba(34,211,238,.38))`)
    if (effect.type === 'warm-film') filters.push(`sepia(${Number(effect.params.sepia || 0.18)}) saturate(${Number(effect.params.saturation || 1.1)}) brightness(${Number(effect.params.brightness || 1.03)})`)
    if (effect.type === 'cold-night') filters.push(`hue-rotate(${Number(effect.params.hue || 190)}deg) contrast(${Number(effect.params.contrast || 1.1)}) brightness(${Number(effect.params.brightness || 0.92)})`)
  }
  return filters.join(' ')
}

function hasVignette(clip: TimelineClip) {
  return clip.effects.some((effect) => effect.enabled && effect.type === 'vignette')
}

function hasGlow(clip: TimelineClip) {
  return clip.effects.some((effect) => effect.enabled && effect.type === 'neon')
}

function previewTransitionStyle(project: ProjectJson, clip: TimelineClip, currentTime: number): CSSProperties {
  const activeTransition = project.transitions.find((transition) => (
    currentTime >= transition.start &&
    currentTime <= transition.start + transition.duration &&
    (transition.fromClipId === clip.id || transition.toClipId === clip.id)
  ))
  if (!activeTransition) return {}
  const progress = Math.min(1, Math.max(0, (currentTime - activeTransition.start) / Math.max(activeTransition.duration, 0.01)))
  const entering = activeTransition.toClipId === clip.id
  const amount = entering ? progress : 1 - progress
  if (activeTransition.type === 'fade') return { opacity: amount * clip.opacity }
  if (activeTransition.type === 'flash') return { opacity: clip.opacity, filter: `${previewFilter(clip)} brightness(${1 + Math.sin(progress * Math.PI) * 0.85})` }
  if (activeTransition.type === 'zoom-in') return { opacity: clip.opacity, scale: amount }
  if (activeTransition.type === 'slide-left') return { opacity: clip.opacity, translate: `${entering ? (1 - progress) * 22 : progress * -22}% 0` }
  if (activeTransition.type === 'wipe') return { opacity: clip.opacity, clipPath: `inset(0 ${entering ? (1 - progress) * 100 : progress * 100}% 0 0)` }
  return {}
}
