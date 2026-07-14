import { toScreen, type PlayfieldTransform } from './canvas'

export function drawHitCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusOsuPixels: number,
  transform: PlayfieldTransform,
  color: string,
  label: string,
): void {
  const [sx, sy] = toScreen(x, y, transform)
  const radius = radiusOsuPixels * transform.scale

  ctx.beginPath()
  ctx.arc(sx, sy, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'white'
  ctx.stroke()

  ctx.fillStyle = 'white'
  ctx.font = `${Math.max(10, radius * 0.6)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, sx, sy)
}
