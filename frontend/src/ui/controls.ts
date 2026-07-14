import type { PlaybackHandle } from '../render/renderLoop'
import { attachUiSound } from './sound'

export interface Controls {
  onTick: (mapTimeMs: number, maxTimeMs: number) => void
  bind: (playback: PlaybackHandle) => void
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
  const speedButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.speed-btn'))
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
    bind(playback) {
      seekBar.max = String(playback.getMaxTimeMs())

      seekBar.addEventListener('input', () => {
        playback.seek(Number(seekBar.value))
      })

      speedButtons.forEach((btn) => {
        attachUiSound(btn)
        btn.addEventListener('click', () => {
          const rate = Number(btn.dataset.speed)
          playback.setSpeed(rate)
          speedButtons.forEach((b) => b.classList.toggle('active', b === btn))
        })
      })

      playback.setVolume(Number(volumeSlider.value) / 100)
      volumeSlider.addEventListener('input', () => {
        playback.setVolume(Number(volumeSlider.value) / 100)
      })
    },
  }
}
