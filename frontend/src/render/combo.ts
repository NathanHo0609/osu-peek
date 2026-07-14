import type { Color4 } from 'osu-classes'

// The real default osu! skin's combo colors, used when a beatmap defines none of its own.
export const DEFAULT_COMBO_COLORS = ['#FFC000', '#00CA00', '#127CFF', '#F21839']

function toHex(color4: Color4): string {
  const channel = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${channel(color4.red)}${channel(color4.green)}${channel(color4.blue)}`
}

export function paletteFromBeatmap(comboColors: Color4[]): string[] {
  return comboColors.length > 0 ? comboColors.map(toHex) : DEFAULT_COMBO_COLORS
}
