import { toScreen, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT, type PlayfieldTransform } from './canvas'
import type { LoadedSkin } from '../skin/skinLoader'

// osu! always renders spinners centered on the playfield, ignoring any position in the file.
export const SPINNER_CENTER = { x: PLAYFIELD_WIDTH / 2, y: PLAYFIELD_HEIGHT / 2 }
const SPINNER_RADIUS_OSUPX = 150

export function drawSpinner(
  ctx: CanvasRenderingContext2D,
  transform: PlayfieldTransform,
  rotationRadians: number,
  progress: number,
  color: string,
  skin?: LoadedSkin,
): void {
  const [cx, cy] = toScreen(SPINNER_CENTER.x, SPINNER_CENTER.y, transform)
  const outerRadius = SPINNER_RADIUS_OSUPX * transform.scale

  if (skin?.spinnerBackground) {
    const size = outerRadius * 2
    ctx.drawImage(skin.spinnerBackground, cx - size / 2, cy - size / 2, size, size)
  } else {
    ctx.beginPath()
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = 'white'
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(cx, cy, outerRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress))
  ctx.lineWidth = 6
  ctx.strokeStyle = color
  ctx.stroke()

  if (skin?.spinnerCircle) {
    const size = outerRadius * 1.2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotationRadians)
    ctx.drawImage(skin.spinnerCircle, -size / 2, -size / 2, size, size)
    ctx.restore()
    return
  }

  const handLength = outerRadius * 0.8
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(rotationRadians) * handLength, cy + Math.sin(rotationRadians) * handLength)
  ctx.lineWidth = 4
  ctx.strokeStyle = 'white'
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, 6, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()
}
