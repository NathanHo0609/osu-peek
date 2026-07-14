import { BeatmapDecoder } from 'osu-parsers'
import type { Beatmap } from 'osu-classes'
import { StandardRuleset, type StandardBeatmap } from 'osu-standard-stable'

const decoder = new BeatmapDecoder()
const ruleset = new StandardRuleset()

export function parseBeatmap(osuFileText: string): Beatmap {
  return decoder.decodeFromString(osuFileText)
}

// Converts the generic decoded beatmap into an osu!standard-specific one. This is what
// computes slider paths/durations and per-object timing/combo data properly, rather than
// us re-deriving it by hand.
export function toStandardBeatmap(beatmap: Beatmap): StandardBeatmap {
  return ruleset.applyToBeatmap(beatmap)
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
