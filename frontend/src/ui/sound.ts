// Small synthesized UI sounds (no audio files needed) for a livelier, game-menu feel.
let ctx: AudioContext | null = null

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function blip(
  startFreq: number,
  endFreq: number,
  durationSec: number,
  peakGain: number,
  type: OscillatorType = 'sine',
): void {
  const audioCtx = getContext()
  const now = audioCtx.currentTime

  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(startFreq, now)
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + durationSec)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)

  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(now)
  osc.stop(now + durationSec + 0.02)
}

export function playHover(): void {
  blip(700, 1100, 0.09, 0.05, 'sine')
}

export function playClick(): void {
  blip(500, 900, 0.12, 0.09, 'triangle')
}

export function playToggleOn(): void {
  blip(500, 1400, 0.15, 0.08, 'square')
}

export function playToggleOff(): void {
  blip(700, 300, 0.15, 0.08, 'square')
}

export function attachUiSound(el: HTMLElement, options: { hover?: boolean; click?: boolean } = {}): void {
  const { hover = true, click = true } = options
  if (hover) el.addEventListener('mouseenter', () => playHover())
  if (click) el.addEventListener('click', () => playClick())
}
