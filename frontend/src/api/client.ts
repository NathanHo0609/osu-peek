import { credentialHeaders } from './credentials'

export interface BeatmapLookupResult {
  beatmapId: number
  beatmapsetId: number
  title: string
  artist: string
  creator: string
  version: string
  difficultyRating: number
  cs: number
  ar: number
  od: number
  hp: number
  bpm: number
  totalLengthSeconds: number
  coverUrl: string
  difficultyCount?: number
}

const API_BASE = 'http://localhost:3001'

export async function lookupBeatmap(query: string): Promise<BeatmapLookupResult> {
  const response = await fetch(`${API_BASE}/api/lookup?query=${encodeURIComponent(query)}`, {
    headers: credentialHeaders(),
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'Lookup failed')
  }

  return data as BeatmapLookupResult
}

export function audioPreviewUrl(beatmapsetId: number): string {
  return `${API_BASE}/api/beatmapset/${beatmapsetId}/audio-preview`
}

export function fullAudioUrl(beatmapsetId: number): string {
  return `${API_BASE}/api/beatmapset/${beatmapsetId}/full-audio`
}

export async function fetchBeatmapFile(beatmapId: number): Promise<string> {
  const response = await fetch(`${API_BASE}/api/beatmap/${beatmapId}/file`)
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error ?? 'Failed to fetch beatmap file')
  }
  return response.text()
}
