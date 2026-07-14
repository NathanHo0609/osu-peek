export const PLAYFIELD_WIDTH = 512
export const PLAYFIELD_HEIGHT = 384

export interface PlayfieldTransform {
  scale: number
  offsetX: number
  offsetY: number
}

// marginOsuPixels reserves room around the 512x384 playfield (in osu!pixel units, so it
// scales correctly with circle size) for objects whose hit circles/approach circles
// extend past the strict playfield edge — without it, edge-positioned objects clip.
export function computeTransform(canvas: HTMLCanvasElement, marginOsuPixels = 0): PlayfieldTransform {
  const totalWidth = PLAYFIELD_WIDTH + marginOsuPixels * 2
  const totalHeight = PLAYFIELD_HEIGHT + marginOsuPixels * 2
  const scale = Math.min(canvas.width / totalWidth, canvas.height / totalHeight)
  const offsetX = (canvas.width - PLAYFIELD_WIDTH * scale) / 2
  const offsetY = (canvas.height - PLAYFIELD_HEIGHT * scale) / 2
  return { scale, offsetX, offsetY }
}

// Sizes the canvas's actual pixel resolution (not just its CSS display size) to fill
// its container, up to maxWidth, keeping the 512x384 (4:3) aspect ratio.
export function fitCanvasToContainer(canvas: HTMLCanvasElement, maxWidth = 960): void {
  const containerWidth = canvas.parentElement?.clientWidth ?? maxWidth
  const width = Math.max(320, Math.min(containerWidth, maxWidth))
  const height = width * (PLAYFIELD_HEIGHT / PLAYFIELD_WIDTH)
  canvas.width = width
  canvas.height = height
}

export function toScreen(x: number, y: number, transform: PlayfieldTransform): [number, number] {
  return [transform.offsetX + x * transform.scale, transform.offsetY + y * transform.scale]
}

// osu!standard's hit circle radius, in osu!pixels, derived from Circle Size (CS).
export function circleRadiusOsuPixels(cs: number): number {
  return 54.4 - 4.48 * cs
}
