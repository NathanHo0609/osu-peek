import { Router } from 'express'
import { TtlCache } from '../cache.js'

const router = Router()
const fileCache = new TtlCache<string>(30 * 60 * 1000)

router.get('/beatmap/:id/file', async (req, res) => {
  const { id } = req.params

  const cached = fileCache.get(id)
  if (cached) {
    res.type('text/plain').send(cached)
    return
  }

  try {
    const response = await fetch(`https://osu.ppy.sh/osu/${id}`)
    if (!response.ok) {
      res.status(response.status).json({ error: `osu! returned ${response.status} for that beatmap file.` })
      return
    }

    const text = await response.text()
    fileCache.set(id, text)
    res.type('text/plain').send(text)
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch the beatmap file from osu!.' })
  }
})

export default router
