import type { EditorAsset, TimelineClip } from '../project/project.types'

export function createClipFromAsset(asset: EditorAsset, trackId: string, start: number): TimelineClip {
  const isAudio = asset.type === 'audio'
  const isImage = asset.type === 'image' || asset.type === 'sticker'
  const duration = asset.duration || (isImage ? 5 : 8)
  return {
    id: crypto.randomUUID(),
    type: isAudio ? 'audio' : isImage ? 'image' : 'video',
    trackId,
    assetId: asset.id,
    start,
    duration,
    trimStart: 0,
    trimEnd: duration,
    position: { x: 0, y: 0 },
    size: { width: asset.width || 1080, height: asset.height || 1920 },
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
