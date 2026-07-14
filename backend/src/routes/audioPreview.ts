import { Router } from 'express'
import { TtlCache } from '../cache.js'

interface CachedAudio {
  buffer: Buffer
  contentType: string
}

const router = Router()
const audioCache = new TtlCache<CachedAudio>(60 * 60 * 1000)

router.get('/beatmapset/:id/audio-preview', async (req, res) => {
  const { id } = req.params

  const cached = audioCache.get(id)
  if (cached) {
    res.type(cached.contentType).send(cached.buffer)
    return
  }

  try {
    const response = await fetch(`https://b.ppy.sh/preview/${id}.mp3`)
    if (!response.ok) {
      res.status(response.status).json({ error: `osu! returned ${response.status} for that audio preview.` })
      return
    }

    const contentType = response.headers.get('content-type') ?? 'audio/mpeg'
    const buffer = Buffer.from(await response.arrayBuffer())
    audioCache.set(id, { buffer, contentType })
    res.type(contentType).send(buffer)
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch the audio preview from osu!.' })
  }
})

export default router
