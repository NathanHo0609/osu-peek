// Just enough of an .ini parser to pull combo colors out of a skin.ini's [Colours] section.
// We don't need the rest of skin.ini (fonts, layout, etc.) for the v1 element subset.
export function parseComboColors(iniText: string): string[] {
  const colors: { index: number; hex: string }[] = []
  let inColours = false

  for (const rawLine of iniText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.startsWith('[')) {
      inColours = line.toLowerCase() === '[colours]'
      continue
    }
    if (!inColours || !line.includes(':')) continue

    const [key, value] = line.split(':').map((s) => s.trim())
    const match = key.match(/^Combo(\d+)$/i)
    if (!match) continue

    const parts = value.split(',').map(Number)
    if (parts.length < 3 || parts.some(Number.isNaN)) continue

    const [r, g, b] = parts
    const hex = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
    colors.push({ index: Number(match[1]), hex })
  }

  return colors.sort((a, b) => a.index - b.index).map((c) => c.hex)
}
