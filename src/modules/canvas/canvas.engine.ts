import type { ProjectJson } from '../project/project.types'

export function getVisibleClipsAtTime(project: ProjectJson, currentTime: number) {
  return project.clips
    .filter((clip) => currentTime >= clip.start && currentTime <= clip.start + clip.duration)
    .sort((a, b) => {
      const trackA = project.tracks.find((track) => track.id === a.trackId)?.order || 0
      const trackB = project.tracks.find((track) => track.id === b.trackId)?.order || 0
      return trackA - trackB
    })
}
