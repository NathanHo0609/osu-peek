export const PLAYFIELD_WIDTH = 512
export const PLAYFIELD_HEIGHT = 384

export interface PlayfieldTransform {
  scale: number
  offsetX: number
  offsetY: number
}

export function computeTransform(canvas: HTMLCanvasElement, margin = 16): PlayfieldTransform {
  const availableWidth = canvas.width - margin * 2
  const availableHeight = canvas.height - margin * 2
  const scale = Math.min(availableWidth / PLAYFIELD_WIDTH, availableHeight / PLAYFIELD_HEIGHT)
  const offsetX = (canvas.width - PLAYFIELD_WIDTH * scale) / 2
  const offsetY = (canvas.height - PLAYFIELD_HEIGHT * scale) / 2
  return { scale, offsetX, offsetY }
}

export function toScreen(x: number, y: number, transform: PlayfieldTransform): [number, number] {
  return [transform.offsetX + x * transform.scale, transform.offsetY + y * transform.scale]
}

// osu!standard's hit circle radius, in osu!pixels, derived from Circle Size (CS).
export function circleRadiusOsuPixels(cs: number): number {
  return 54.4 - 4.48 * cs
}
