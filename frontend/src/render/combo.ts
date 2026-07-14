import { HitType, type HitObject, type Color4 } from 'osu-classes'

// The real default osu! skin's combo colors, used when a beatmap defines none of its own.
export const DEFAULT_COMBO_COLORS = ['#FFC000', '#00CA00', '#127CFF', '#F21839']

export interface ComboInfo {
  color: string
  number: number
}

function toHex(color4: Color4): string {
  const channel = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${channel(color4.red)}${channel(color4.green)}${channel(color4.blue)}`
}

export function paletteFromBeatmap(comboColors: Color4[]): string[] {
  return comboColors.length > 0 ? comboColors.map(toHex) : DEFAULT_COMBO_COLORS
}

export function assignCombos(hitObjects: HitObject[], palette: string[] = DEFAULT_COMBO_COLORS): ComboInfo[] {
  const result: ComboInfo[] = []
  let comboIndex = -1
  let number = 0

  hitObjects.forEach((obj, i) => {
    const isNewCombo = i === 0 || (obj.hitType & HitType.NewCombo) !== 0
    if (isNewCombo) {
      if (i === 0) {
        comboIndex = 0
      } else {
        // A mapper can skip extra color indices on a new combo via the ComboSkip bits.
        const comboOffset = (obj.hitType & HitType.ComboOffset) >> 4
        comboIndex = (comboIndex + 1 + comboOffset) % palette.length
      }
      number = 1
    } else {
      number += 1
    }
    result.push({ color: palette[comboIndex], number })
  })

  return result
}
