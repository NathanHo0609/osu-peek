import { BeatmapDecoder } from 'osu-parsers'
import type { Beatmap } from 'osu-classes'

const decoder = new BeatmapDecoder()

export function parseBeatmap(osuFileText: string): Beatmap {
  return decoder.decodeFromString(osuFileText)
}

export interface ParseSummary {
  objectCount: number
  firstObjectTimeMs: number
  lastObjectTimeMs: number
  timingPointCount: number
}

export function summarizeBeatmap(beatmap: Beatmap): ParseSummary {
  const hitObjects = beatmap.hitObjects
  return {
    objectCount: hitObjects.length,
    firstObjectTimeMs: hitObjects[0]?.startTime ?? 0,
    lastObjectTimeMs: hitObjects[hitObjects.length - 1]?.startTime ?? 0,
    timingPointCount: beatmap.controlPoints.timingPoints.length,
  }
}
