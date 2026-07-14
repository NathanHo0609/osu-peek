import type { PlaybackHandle } from '../render/renderLoop'

export interface Controls {
  onTick: (mapTimeMs: number, maxTimeMs: number) => void
  // Takes a getter rather than a fixed handle, since mods (Easy/HardRock) rebuild the
  // underlying playback engine — the seek bar/volume slider should keep controlling
  // whatever the current one is, without needing to be re-bound each time.
  bind: (getPlayback: () => PlaybackHandle | null) => void
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function setupControls(container: HTMLElement): Controls {
  const seekBar = container.querySelector<HTMLInputElement>('#seek-bar')!
  const timeLabel = container.querySelector<HTMLSpanElement>('#time-label')!
  const volumeSlider = container.querySelector<HTMLInputElement>('#volume-slider')!

  let dragging = false
  seekBar.addEventListener('pointerdown', () => {
    dragging = true
  })
  seekBar.addEventListener('pointerup', () => {
    dragging = false
  })

  return {
    onTick(mapTimeMs, maxTimeMs) {
      seekBar.max = String(maxTimeMs)
      if (!dragging) seekBar.value = String(mapTimeMs)
      timeLabel.textContent = `${formatMs(mapTimeMs)} / ${formatMs(maxTimeMs)}`
    },
    bind(getPlayback) {
      const playback = getPlayback()
      if (playback) seekBar.max = String(playback.getMaxTimeMs())

      seekBar.addEventListener('input', () => {
        getPlayback()?.seek(Number(seekBar.value))
      })

      const applyVolume = () => getPlayback()?.setVolume(Number(volumeSlider.value) / 100)
      applyVolume()
      volumeSlider.addEventListener('input', applyVolume)
    },
  }
}
