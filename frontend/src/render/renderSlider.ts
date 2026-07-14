import type { Vector2 } from 'osu-classes'
import { toScreen, type PlayfieldTransform } from './canvas'

export function drawSliderBody(
  ctx: CanvasRenderingContext2D,
  pathPoints: Vector2[],
  origin: Vector2,
  radiusOsuPixels: number,
  transform: PlayfieldTransform,
  color: string,
): void {
  if (pathPoints.length === 0) return

  const radius = radiusOsuPixels * transform.scale
  const baseAlpha = ctx.globalAlpha

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  const [startX, startY] = toScreen(origin.x + pathPoints[0].x, origin.y + pathPoints[0].y, transform)
  ctx.moveTo(startX, startY)
  for (let i = 1; i < pathPoints.length; i++) {
    const [x, y] = toScreen(origin.x + pathPoints[i].x, origin.y + pathPoints[i].y, transform)
    ctx.lineTo(x, y)
  }

  ctx.lineWidth = radius * 2
  ctx.strokeStyle = color
  ctx.globalAlpha = baseAlpha * 0.5
  ctx.stroke()

  ctx.globalAlpha = baseAlpha
  ctx.lineWidth = 2
  ctx.strokeStyle = 'white'
  ctx.stroke()
}

export function drawSliderBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusOsuPixels: number,
  transform: PlayfieldTransform,
): void {
  const [sx, sy] = toScreen(x, y, transform)
  const radius = radiusOsuPixels * transform.scale * 0.6

  ctx.beginPath()
  ctx.arc(sx, sy, radius, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()
}

export function drawReverseArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  directionAngle: number,
  radiusOsuPixels: number,
  transform: PlayfieldTransform,
): void {
  const [sx, sy] = toScreen(x, y, transform)
  const size = radiusOsuPixels * transform.scale * 0.4

  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(directionAngle)
  ctx.beginPath()
  ctx.moveTo(size, 0)
  ctx.lineTo(-size * 0.6, size * 0.7)
  ctx.lineTo(-size * 0.6, -size * 0.7)
  ctx.closePath()
  ctx.fillStyle = 'white'
  ctx.fill()
  ctx.restore()
}

export function angleBetween(from: Vector2, to: Vector2): number {
  return Math.atan2(to.y - from.y, to.x - from.x)
}
