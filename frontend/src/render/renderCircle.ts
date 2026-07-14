import { toScreen, type PlayfieldTransform } from './canvas'
import type { LoadedSkin } from '../skin/skinLoader'

// Tints a white/grayscale skin image with a combo color, the way osu! itself colors
// hitcircle.png. Only safe for solid-disc images (a ring-shaped image would bleed
// color into its transparent center) — that's why approach circles skip this.
function drawTintedCircleImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  diameter: number,
  color: string,
): void {
  ctx.save()
  ctx.drawImage(img, cx - diameter / 2, cy - diameter / 2, diameter, diameter)
  ctx.globalCompositeOperation = 'multiply'
  ctx.beginPath()
  ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

function drawComboNumber(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  label: string,
  skin?: LoadedSkin,
): void {
  const digitImages = skin?.digits
  const hasAllDigits = digitImages && [...label].every((ch) => digitImages[Number(ch)] !== undefined)

  if (hasAllDigits) {
    const targetHeight = radius * 0.8
    const widths = [...label].map((ch) => {
      const img = digitImages![Number(ch)]!
      return (img.width / img.height) * targetHeight
    })
    const totalWidth = widths.reduce((a, b) => a + b, 0)
    let drawX = cx - totalWidth / 2
    for (let i = 0; i < label.length; i++) {
      const img = digitImages![Number(label[i])]!
      ctx.drawImage(img, drawX, cy - targetHeight / 2, widths[i], targetHeight)
      drawX += widths[i]
    }
    return
  }

  ctx.fillStyle = 'white'
  ctx.font = `${Math.max(10, radius * 0.6)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy)
}

export function drawHitCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusOsuPixels: number,
  transform: PlayfieldTransform,
  color: string,
  label: string,
  skin?: LoadedSkin,
): void {
  const [sx, sy] = toScreen(x, y, transform)
  const radius = radiusOsuPixels * transform.scale

  if (skin?.hitcircle) {
    drawTintedCircleImage(ctx, skin.hitcircle, sx, sy, radius * 2, color)
    if (skin.hitcircleoverlay) {
      ctx.drawImage(skin.hitcircleoverlay, sx - radius, sy - radius, radius * 2, radius * 2)
    }
  } else {
    ctx.beginPath()
    ctx.arc(sx, sy, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'white'
    ctx.stroke()
  }

  drawComboNumber(ctx, sx, sy, radius, label, skin)
}

export function drawApproachCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusOsuPixels: number,
  transform: PlayfieldTransform,
  color: string,
  skin?: LoadedSkin,
): void {
  const [sx, sy] = toScreen(x, y, transform)
  const radius = radiusOsuPixels * transform.scale

  if (skin?.approachcircle) {
    ctx.drawImage(skin.approachcircle, sx - radius, sy - radius, radius * 2, radius * 2)
    return
  }

  ctx.beginPath()
  ctx.arc(sx, sy, radius, 0, Math.PI * 2)
  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.stroke()
}
