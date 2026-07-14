import { Router } from 'express'
import JSZip from 'jszip'
import { TtlCache } from '../cache.js'

interface CachedAudio {
  buffer: Buffer
  contentType: string
}

const router = Router()
const fullAudioCache = new TtlCache<CachedAudio>(2 * 60 * 60 * 1000)

function contentTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.ogg')) return 'audio/ogg'
  if (lower.endsWith('.wav')) return 'audio/wav'
  return 'audio/mpeg'
}

router.get('/beatmapset/:id/full-audio', async (req, res) => {
  const { id } = req.params

  const cached = fullAudioCache.get(id)
  if (cached) {
    res.type(cached.contentType).send(cached.buffer)
    return
  }

  try {
    // osu.direct is a free, no-auth community mirror -- the official osu! API's own
    // download endpoint is restricted to the real osu!lazer client and 403s otherwise.
    const response = await fetch(`https://osu.direct/api/d/${id}?noVideo=true`)
    if (!response.ok) {
      res.status(502).json({ error: `Mirror returned ${response.status} for that beatmapset.` })
      return
    }

    const zip = await JSZip.loadAsync(await response.arrayBuffer())

    const osuEntry = Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith('.osu'))
    if (!osuEntry) {
      res.status(502).json({ error: 'Downloaded package had no beatmap files inside.' })
      return
    }

    const osuText = await osuEntry.async('text')
    const match = osuText.match(/^AudioFilename:\s*(.+)$/m)
    const audioFilename = match?.[1]?.trim()
    if (!audioFilename) {
      res.status(502).json({ error: "Couldn't find the audio filename in the beatmap." })
      return
    }

    const audioEntry = Object.values(zip.files).find(
      (f) => !f.dir && f.name.toLowerCase() === audioFilename.toLowerCase(),
    )
    if (!audioEntry) {
      res.status(502).json({ error: 'Audio file referenced by the beatmap was missing from the package.' })
      return
    }

    const buffer = Buffer.from(await audioEntry.async('arraybuffer'))
    const contentType = contentTypeForFilename(audioFilename)
    fullAudioCache.set(id, { buffer, contentType })
    res.type(contentType).send(buffer)
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch the full song from the mirror.' })
  }
})

export default router
