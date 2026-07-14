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
  const response = await fetch(`${API_BASE}/api/lookup?query=${encodeURIComponent(query)}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'Lookup failed')
  }

  return data as BeatmapLookupResult
}
