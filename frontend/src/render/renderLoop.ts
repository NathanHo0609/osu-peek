import type { Beatmap } from 'osu-classes'
import { computeTransform, circleRadiusOsuPixels } from './canvas'
import { assignCombos } from './combo'
import { drawHitCircle, drawApproachCircle } from './renderCircle'
import { approachPreemptMs, approachFadeInMs } from '../beatmap/difficulty'
import type { AudioController } from '../audio/audioController'

const FADE_OUT_MS = 150
const APPROACH_SCALE = 3
const END_BUFFER_MS = 1000

export interface PlaybackHandle {
  play(): void
  pause(): void
  isPlaying(): boolean
  destroy(): void
}

export function startPlayback(canvas: HTMLCanvasElement, beatmap: Beatmap, audio: AudioController): PlaybackHandle {
  const ctx = canvas.getContext('2d')!
  const transform = computeTransform(canvas)
  const radius = circleRadiusOsuPixels(beatmap.difficulty.circleSize)
  const combos = assignCombos(beatmap.hitObjects)
  const preemptMs = approachPreemptMs(beatmap.difficulty.approachRate)
  const fadeInMs = approachFadeInMs(beatmap.difficulty.approachRate)
  const lastObject = beatmap.hitObjects[beatmap.hitObjects.length - 1]
  const maxTimeMs = (lastObject?.startTime ?? 0) + FADE_OUT_MS + END_BUFFER_MS

  let mapTimeMs = 0
  let playing = false
  let lastFrameTime = performance.now()
  let rafId = 0

  function draw() {
    ctx.fillStyle = '#0d0e14'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < beatmap.hitObjects.length; i++) {
      const obj = beatmap.hitObjects[i]
      const appearAt = obj.startTime - preemptMs
      const disappearAt = obj.startTime + FADE_OUT_MS
      if (mapTimeMs < appearAt || mapTimeMs > disappearAt) continue

      const combo = combos[i]
      let opacity = 1
      if (mapTimeMs < appearAt + fadeInMs) {
        opacity = (mapTimeMs - appearAt) / fadeInMs
      } else if (mapTimeMs > obj.startTime) {
        opacity = 1 - (mapTimeMs - obj.startTime) / FADE_OUT_MS
      }
      opacity = Math.max(0, Math.min(1, opacity))

      ctx.globalAlpha = opacity
      drawHitCircle(ctx, obj.startPosition.x, obj.startPosition.y, radius, transform, combo.color, String(combo.number))

      if (mapTimeMs <= obj.startTime) {
        const approachProgress = Math.max(0, Math.min(1, (mapTimeMs - appearAt) / preemptMs))
        const approachScale = APPROACH_SCALE - (APPROACH_SCALE - 1) * approachProgress
        drawApproachCircle(ctx, obj.startPosition.x, obj.startPosition.y, radius * approachScale, transform, combo.color)
      }

      ctx.globalAlpha = 1
    }
  }

  function frame(now: number) {
    const delta = now - lastFrameTime
    lastFrameTime = now

    if (playing) {
      mapTimeMs += delta
      if (mapTimeMs >= maxTimeMs) {
        mapTimeMs = maxTimeMs
        playing = false
      }
    }

    audio.sync(mapTimeMs, playing)
    draw()
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
    isPlaying() {
      return playing
    },
    destroy() {
      cancelAnimationFrame(rafId)
    },
  }
}
