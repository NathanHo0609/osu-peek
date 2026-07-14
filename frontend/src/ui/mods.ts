import { ModBitwise } from 'osu-classes'
import { attachUiSound } from './sound'

export interface ModsController {
  bitwise(): number
}

type RateSource = 'none' | 'dt' | 'ht' | 'slider'

// EZ/HR/HD all change per-object data baked in at beatmap-conversion time (stats,
// position flip, fade timing), so toggling any of them needs a beatmap rebuild via
// `onBeatmapModsChanged`. DT/HT/the rate slider are purely a playback-speed multiplier
// applied live, no rebuild needed — that's `onRateChanged`.
export function setupMods(
  container: HTMLElement,
  onBeatmapModsChanged: () => void,
  onRateChanged: (rate: number) => void,
): ModsController {
  const ezBtn = container.querySelector<HTMLButtonElement>('[data-mod="EZ"]')!
  const hrBtn = container.querySelector<HTMLButtonElement>('[data-mod="HR"]')!
  const hdBtn = container.querySelector<HTMLButtonElement>('[data-mod="HD"]')!
  const dtBtn = container.querySelector<HTMLButtonElement>('[data-mod="DT"]')!
  const htBtn = container.querySelector<HTMLButtonElement>('[data-mod="HT"]')!
  const rateSlider = container.querySelector<HTMLInputElement>('#rate-slider')!
  const rateLabel = container.querySelector<HTMLSpanElement>('#rate-label')!

  ;[ezBtn, hrBtn, hdBtn, dtBtn, htBtn].forEach((btn) => attachUiSound(btn))

  let easy = false
  let hardRock = false
  let hidden = false
  let rateSource: RateSource = 'none'

  function setDifficultyMod(which: 'ez' | 'hr' | 'none') {
    easy = which === 'ez'
    hardRock = which === 'hr'
    ezBtn.classList.toggle('active', easy)
    hrBtn.classList.toggle('active', hardRock)
    onBeatmapModsChanged()
  }

  function toggleHidden() {
    hidden = !hidden
    hdBtn.classList.toggle('active', hidden)
    onBeatmapModsChanged()
  }

  function setRate(rate: number, source: RateSource) {
    rateSource = source
    dtBtn.classList.toggle('active', source === 'dt')
    htBtn.classList.toggle('active', source === 'ht')
    rateSlider.disabled = source === 'dt' || source === 'ht'
    dtBtn.disabled = source === 'slider'
    htBtn.disabled = source === 'slider'
    if (source !== 'slider') rateSlider.value = '1'
    rateLabel.textContent = `${rate.toFixed(2)}x`
    onRateChanged(rate)
  }

  ezBtn.addEventListener('click', () => setDifficultyMod(easy ? 'none' : 'ez'))
  hrBtn.addEventListener('click', () => setDifficultyMod(hardRock ? 'none' : 'hr'))
  hdBtn.addEventListener('click', toggleHidden)
  dtBtn.addEventListener('click', () => setRate(rateSource === 'dt' ? 1 : 1.5, rateSource === 'dt' ? 'none' : 'dt'))
  htBtn.addEventListener('click', () => setRate(rateSource === 'ht' ? 1 : 0.75, rateSource === 'ht' ? 'none' : 'ht'))
  rateSlider.addEventListener('input', () => {
    const value = Number(rateSlider.value)
    setRate(value, value === 1 ? 'none' : 'slider')
  })

  return {
    bitwise() {
      let bits = 0
      if (easy) bits |= ModBitwise.Easy
      if (hardRock) bits |= ModBitwise.HardRock
      if (hidden) bits |= ModBitwise.Hidden
      return bits
    },
  }
}
