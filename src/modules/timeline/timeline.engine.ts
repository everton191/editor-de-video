import type { EditorAsset, TimelineClip } from '../project/project.types'

export function createClipFromAsset(asset: EditorAsset, trackId: string, start: number, projectSize?: { width: number; height: number }): TimelineClip {
  const isAudio = asset.type === 'audio'
  const isImage = asset.type === 'image' || asset.type === 'sticker'
  const duration = asset.duration || (isImage ? 5 : 8)
  const projectWidth = projectSize?.width || asset.width || 1080
  const projectHeight = projectSize?.height || asset.height || 1920
  const assetWidth = asset.width || projectWidth
  const assetHeight = asset.height || projectHeight
  const fitScale = isAudio ? 1 : Math.min(projectWidth / assetWidth, projectHeight / assetHeight, 1)
  const fittedWidth = Math.max(1, Math.round(assetWidth * fitScale))
  const fittedHeight = Math.max(1, Math.round(assetHeight * fitScale))
  return {
    id: crypto.randomUUID(),
    type: isAudio ? 'audio' : isImage ? 'image' : 'video',
    trackId,
    assetId: asset.id,
    start,
    duration,
    trimStart: 0,
    trimEnd: duration,
    position: isAudio ? { x: 0, y: 0 } : { x: projectWidth / 2, y: projectHeight / 2 },
    size: isAudio ? { width: assetWidth, height: assetHeight } : { width: fittedWidth, height: fittedHeight },
    scale: 1,
    rotation: 0,
    opacity: 1,
    volume: 1,
    blendMode: 'normal',
    effects: [],
    animations: [],
    keyframes: [],
    metadata: {},
  }
}

export function splitClipAt(clip: TimelineClip, time: number): TimelineClip[] {
  if (time <= clip.start || time >= clip.start + clip.duration) return [clip]
  const leftDuration = time - clip.start
  const rightDuration = clip.duration - leftDuration
  return [
    { ...clip, id: crypto.randomUUID(), duration: leftDuration, trimEnd: clip.trimStart + leftDuration },
    { ...clip, id: crypto.randomUUID(), start: time, duration: rightDuration, trimStart: clip.trimStart + leftDuration },
  ]
}

export const moveClip = (clip: TimelineClip, start: number, trackId = clip.trackId): TimelineClip => ({
  ...clip,
  start: Math.max(0, start),
  trackId,
})
