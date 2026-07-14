import { Router, type Request } from 'express'
import { getOsuAccessToken } from '../osuAuth.js'
import { TtlCache } from '../cache.js'

const router = Router()
const lookupCache = new TtlCache<NormalizedBeatmap>(10 * 60 * 1000)

// Each visitor brings their own osu! OAuth app credentials via headers, so no one
// shares (or exhausts) anyone else's API quota. Falls back to the server's own .env
// credentials when none are provided, which keeps local development simple.
function resolveCredentials(req: Request): { clientId: string; clientSecret: string } | null {
  const headerClientId = req.header('X-Osu-Client-Id')
  const headerClientSecret = req.header('X-Osu-Client-Secret')
  if (headerClientId && headerClientSecret) {
    return { clientId: headerClientId, clientSecret: headerClientSecret }
  }

  const envClientId = process.env.OSU_CLIENT_ID
  const envClientSecret = process.env.OSU_CLIENT_SECRET
  if (envClientId && envClientSecret) {
    return { clientId: envClientId, clientSecret: envClientSecret }
  }

  return null
}

interface NormalizedBeatmap {
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

// Recognizes "beatmapsets/{id}#osu/{diffId}", "beatmapsets/{id}", "beatmaps/{id}",
// or a bare numeric ID (treated as a beatmap/difficulty ID).
function parseOsuInput(input: string): { beatmapId?: string; beatmapsetId?: string } {
  const trimmed = input.trim()

  let match = trimmed.match(/beatmapsets\/(\d+)(?:#\w+\/(\d+))?/)
  if (match) return { beatmapsetId: match[1], beatmapId: match[2] }

  match = trimmed.match(/beatmaps\/(\d+)/)
  if (match) return { beatmapId: match[1] }

  if (/^\d+$/.test(trimmed)) return { beatmapId: trimmed }

  return {}
}

async function osuApiGet(path: string, clientId: string, clientSecret: string): Promise<any> {
  const token = await getOsuAccessToken(clientId, clientSecret)
  const response = await fetch(`https://osu.ppy.sh/api/v2${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`osu! API request to ${path} failed: ${response.status}`)
  }
  return response.json()
}

function normalize(beatmap: any, beatmapset: any, difficultyCount?: number): NormalizedBeatmap {
  return {
    beatmapId: beatmap.id,
    beatmapsetId: beatmapset.id,
    title: beatmapset.title,
    artist: beatmapset.artist,
    creator: beatmapset.creator,
    version: beatmap.version,
    difficultyRating: beatmap.difficulty_rating,
    cs: beatmap.cs,
    ar: beatmap.ar,
    od: beatmap.accuracy,
    hp: beatmap.drain,
    bpm: beatmap.bpm,
    totalLengthSeconds: beatmap.total_length,
    coverUrl: beatmapset.covers?.['cover@2x'] ?? beatmapset.covers?.cover,
    difficultyCount,
  }
}

router.get('/lookup', async (req, res) => {
  const query = String(req.query.query ?? '')
  const { beatmapId, beatmapsetId } = parseOsuInput(query)

  if (!beatmapId && !beatmapsetId) {
    res.status(400).json({ error: 'Could not find a beatmap or beatmapset ID in that input.' })
    return
  }

  const credentials = resolveCredentials(req)
  if (!credentials) {
    res.status(401).json({ error: 'Add your osu! API client ID/secret above before searching.' })
    return
  }

  const cacheKey = beatmapId ? `beatmap:${beatmapId}` : `beatmapset:${beatmapsetId}`
  const cached = lookupCache.get(cacheKey)
  if (cached) {
    res.json(cached)
    return
  }

  try {
    let result: NormalizedBeatmap
    const { clientId, clientSecret } = credentials

    if (beatmapId) {
      const beatmap = await osuApiGet(`/beatmaps/${beatmapId}`, clientId, clientSecret)
      result = normalize(beatmap, beatmap.beatmapset)
    } else {
      const beatmapset = await osuApiGet(`/beatmapsets/${beatmapsetId}`, clientId, clientSecret)
      const standardDiffs = (beatmapset.beatmaps ?? []).filter((b: any) => b.mode === 'osu')
      const chosen =
        [...standardDiffs].sort((a, b) => b.difficulty_rating - a.difficulty_rating)[0] ??
        beatmapset.beatmaps?.[0]

      if (!chosen) {
        res.status(404).json({ error: 'That beatmapset has no difficulties.' })
        return
      }

      result = normalize(chosen, beatmapset, beatmapset.beatmaps.length)
    }

    lookupCache.set(cacheKey, result)
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch data from osu!. Double check your API credentials are correct.' })
  }
})

export default router
