export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.max(0, seconds - minutes * 60)
  return `${minutes.toString().padStart(2, '0')}:${remaining.toFixed(2).padStart(5, '0')}`
}
