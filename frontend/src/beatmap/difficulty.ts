// Standard osu! Approach Rate formulas: how long before an object's hit time its
// approach circle starts shrinking in (preempt), and how long the object itself
// takes to fade from invisible to fully opaque (fadeIn, always shorter than preempt).
export function approachPreemptMs(ar: number): number {
  if (ar > 5) return 1200 - (750 * (ar - 5)) / 5
  if (ar < 5) return 1200 + (600 * (5 - ar)) / 5
  return 1200
}

export function approachFadeInMs(ar: number): number {
  if (ar > 5) return 800 - (500 * (ar - 5)) / 5
  if (ar < 5) return 800 + (400 * (5 - ar)) / 5
  return 800
}
