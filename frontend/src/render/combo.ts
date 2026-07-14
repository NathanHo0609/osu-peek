import { HitType, type HitObject } from 'osu-classes'

export const DEFAULT_COMBO_COLORS = ['#FFC000', '#00CA00', '#127CFF', '#F21839']

export interface ComboInfo {
  color: string
  number: number
}

// Rough combo grouping/coloring for a first visual pass. Real skins can override
// combo colors and osu!'s own numbering has more edge cases (ComboSkip) — refined later.
export function assignCombos(hitObjects: HitObject[], palette: string[] = DEFAULT_COMBO_COLORS): ComboInfo[] {
  const result: ComboInfo[] = []
  let comboIndex = -1
  let number = 0

  hitObjects.forEach((obj, i) => {
    const isNewCombo = i === 0 || (obj.hitType & HitType.NewCombo) !== 0
    if (isNewCombo) {
      comboIndex = (comboIndex + 1) % palette.length
      number = 1
    } else {
      number += 1
    }
    result.push({ color: palette[comboIndex], number })
  })

  return result
}
