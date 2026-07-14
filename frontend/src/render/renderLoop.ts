import { Slider, Spinner, StandardHidden, type StandardBeatmap, type StandardHitObject } from 'osu-standard-stable'
import { computeTransform } from './canvas'
import { DEFAULT_COMBO_COLORS, paletteFromBeatmap } from './combo'
import { drawHitCircle, drawApproachCircle } from './renderCircle'
import { drawSliderBody, drawSliderBall, drawReverseArrow, angleBetween } from './renderSlider'
import { drawSpinner } from './renderSpinner'
import type { AudioController } from '../audio/audioController'
import type { LoadedSkin } from '../skin/skinLoader'

const FADE_OUT_MS = 150
const APPROACH_SCALE = 3
const END_BUFFER_MS = 1000

export interface PlaybackHandle {
  play(): void
  pause(): void
  seek(timeMs: number): void
  setSpeed(rate: number): void
  getSpeed(): number
  setVolume(volume: number): void
  isPlaying(): boolean
  getMapTimeMs(): number
  getMaxTimeMs(): number
  destroy(): void
}

export interface PlaybackOptions {
  onTick?: (mapTimeMs: number, maxTimeMs: number) => void
}

function endTimeOf(obj: StandardHitObject): number {
  if (obj instanceof Slider || obj instanceof Spinner) return obj.endTime
  return obj.startTime
}

export function startPlayback(
  canvas: HTMLCanvasElement,
  beatmap: StandardBeatmap,
  audio: AudioController,
  skin: LoadedSkin | undefined,
  hidden: boolean,
  options: PlaybackOptions = {},
): PlaybackHandle {
  const ctx = canvas.getContext('2d')!
  const transform = computeTransform(canvas)
  // Beatmap-defined colors win (matches real osu!), then the loaded skin's, then our default palette.
  const palette =
    beatmap.colors.comboColors.length > 0
      ? paletteFromBeatmap(beatmap.colors.comboColors)
      : (skin?.comboColors?.length ? skin.comboColors : DEFAULT_COMBO_COLORS)
  const lastObject = beatmap.hitObjects[beatmap.hitObjects.length - 1]
  const maxTimeMs = (lastObject ? endTimeOf(lastObject) : 0) + FADE_OUT_MS + END_BUFFER_MS

  let mapTimeMs = 0
  let playing = false
  let speed = 1
  let lastFrameTime = performance.now()
  let rafId = 0

  // Opacity during the object's active lifetime (fade-in through endTime), ignoring the
  // brief exit fade after — separated out so the exit fade (below) can start from
  // whatever this actually was at endTime, instead of assuming it was fully visible.
  // Under Hidden, circles/slider-heads fade in faster then immediately fade back out,
  // becoming invisible well before their hit time; sliders/spinners stay visible once
  // their active (ball-tracking) phase starts, even under Hidden.
  function baseOpacityAt(obj: StandardHitObject, appearAt: number, endTime: number, t: number): number {
    if (endTime > obj.startTime && t >= obj.startTime) return 1

    const fadeInEnd = appearAt + obj.timeFadeIn
    if (t < fadeInEnd) return (t - appearAt) / obj.timeFadeIn

    if (hidden && !(obj instanceof Spinner)) {
      const fadeOutDuration = obj.timePreempt * StandardHidden.FADE_OUT_DURATION_MULTIPLIER
      return 1 - (t - fadeInEnd) / fadeOutDuration
    }
    return 1
  }

  function computeOpacity(obj: StandardHitObject, appearAt: number, endTime: number): number {
    if (mapTimeMs > endTime) {
      const opacityAtEnd = Math.max(0, Math.min(1, baseOpacityAt(obj, appearAt, endTime, endTime)))
      return opacityAtEnd * (1 - (mapTimeMs - endTime) / FADE_OUT_MS)
    }
    return baseOpacityAt(obj, appearAt, endTime, mapTimeMs)
  }

  function drawObject(obj: StandardHitObject) {
    const endTime = endTimeOf(obj)
    const appearAt = obj.startTime - obj.timePreempt
    const disappearAt = endTime + FADE_OUT_MS
    if (mapTimeMs < appearAt || mapTimeMs > disappearAt) return

    const color = palette[obj.comboIndexWithOffsets % palette.length]
    const label = String(obj.currentComboIndex + 1)

    const opacity = Math.max(0, Math.min(1, computeOpacity(obj, appearAt, endTime)))
    ctx.globalAlpha = opacity

    if (obj instanceof Spinner) {
      const elapsed = Math.max(0, mapTimeMs - obj.startTime)
      const spinsRequired = obj.spinsRequired || 1
      const angularVelocity = obj.duration > 0 ? (spinsRequired * Math.PI * 2) / obj.duration : 0
      const progress = obj.duration > 0 ? elapsed / obj.duration : 0
      drawSpinner(ctx, transform, angularVelocity * elapsed, progress, color, skin)
      ctx.globalAlpha = 1
      return
    }

    if (obj instanceof Slider) {
      drawSliderBody(ctx, obj.path.path, obj.stackedStartPosition, obj.radius, transform, color)

      if (obj.repeats >= 1) {
        const tailPoint = obj.path.path[obj.path.path.length - 1]
        const beforeTail = obj.path.path[Math.max(0, obj.path.path.length - 2)]
        drawReverseArrow(
          ctx,
          obj.stackedStartPosition.x + tailPoint.x,
          obj.stackedStartPosition.y + tailPoint.y,
          angleBetween(beforeTail, tailPoint),
          obj.radius,
          transform,
          skin,
        )
      }

      if (mapTimeMs <= obj.startTime) {
        drawHitCircle(
          ctx,
          obj.stackedStartPosition.x,
          obj.stackedStartPosition.y,
          obj.radius,
          transform,
          color,
          label,
          skin,
        )
      }

      if (mapTimeMs >= obj.startTime && mapTimeMs <= endTime) {
        const progress = (mapTimeMs - obj.startTime) / obj.duration
        const local = obj.path.curvePositionAt(progress, obj.spans)
        drawSliderBall(
          ctx,
          obj.stackedStartPosition.x + local.x,
          obj.stackedStartPosition.y + local.y,
          obj.radius,
          transform,
          skin,
        )
      }
    } else {
      drawHitCircle(
        ctx,
        obj.stackedStartPosition.x,
        obj.stackedStartPosition.y,
        obj.radius,
        transform,
        color,
        label,
        skin,
      )
    }

    if (mapTimeMs <= obj.startTime) {
      const approachProgress = Math.max(0, Math.min(1, (mapTimeMs - appearAt) / obj.timePreempt))
      const approachScale = APPROACH_SCALE - (APPROACH_SCALE - 1) * approachProgress
      drawApproachCircle(
        ctx,
        obj.stackedStartPosition.x,
        obj.stackedStartPosition.y,
        obj.radius * approachScale,
        transform,
        color,
        skin,
      )
    }

    ctx.globalAlpha = 1
  }

  function draw() {
    ctx.fillStyle = '#0d0e14'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (const obj of beatmap.hitObjects) drawObject(obj)
  }

  function frame(now: number) {
    const delta = now - lastFrameTime
    lastFrameTime = now

    if (playing) {
      mapTimeMs += delta * speed
      if (mapTimeMs >= maxTimeMs) {
        mapTimeMs = maxTimeMs
        playing = false
      }
    }

    audio.sync(mapTimeMs, playing)
    draw()
    options.onTick?.(mapTimeMs, maxTimeMs)
    rafId = requestAnimationFrame(frame)
  }

  rafId = requestAnimationFrame(frame)

  return {
    play() {
      if (mapTimeMs >= maxTimeMs) mapTimeMs = 0
      playing = true
      lastFrameTime = performance.now()
    },
    pause() {
      playing = false
    },
    seek(timeMs: number) {
      mapTimeMs = Math.max(0, Math.min(maxTimeMs, timeMs))
      audio.sync(mapTimeMs, playing)
      draw()
    },
    setSpeed(rate: number) {
      speed = rate
      audio.setRate(rate)
    },
    getSpeed() {
      return speed
    },
    setVolume(volume: number) {
      audio.setVolume(volume)
    },
    isPlaying() {
      return playing
    },
    getMapTimeMs() {
      return mapTimeMs
    },
    getMaxTimeMs() {
      return maxTimeMs
    },
    destroy() {
      cancelAnimationFrame(rafId)
    },
  }
}
