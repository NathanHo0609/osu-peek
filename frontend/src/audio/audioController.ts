// Wraps an <audio> element and keeps it following an externally-driven master clock,
// rather than being the clock itself — the preview snippet only covers part of the
// map, so the audio should just play/mute based on whether the clock is inside it.
export class AudioController {
  private audio: HTMLAudioElement
  private previewStartMs: number
  private durationMs = 0

  constructor(src: string, previewStartMs: number) {
    this.audio = new Audio(src)
    this.audio.preload = 'auto'
    this.previewStartMs = previewStartMs
    this.audio.addEventListener('loadedmetadata', () => {
      this.durationMs = this.audio.duration * 1000
    })
  }

  setRate(rate: number): void {
    this.audio.playbackRate = rate
  }

  // Call every animation frame with the current absolute map time and whether playback is active.
  sync(mapTimeMs: number, playing: boolean): void {
    const relativeMs = mapTimeMs - this.previewStartMs
    const inRange = this.durationMs > 0 && relativeMs >= 0 && relativeMs <= this.durationMs

    if (!playing || !inRange) {
      if (!this.audio.paused) this.audio.pause()
      return
    }

    const relativeSeconds = relativeMs / 1000
    if (Math.abs(this.audio.currentTime - relativeSeconds) > 0.15) {
      this.audio.currentTime = relativeSeconds
    }
    if (this.audio.paused) {
      this.audio.play().catch(() => {})
    }
  }

  destroy(): void {
    this.audio.pause()
    this.audio.src = ''
  }
}
