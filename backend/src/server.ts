import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import lookupRouter from './routes/lookup.js'
import beatmapFileRouter from './routes/beatmapFile.js'
import audioPreviewRouter from './routes/audioPreview.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', lookupRouter)
app.use('/api', beatmapFileRouter)
app.use('/api', audioPreviewRouter)

app.listen(PORT, () => {
  console.log(`osu!Peek backend listening on http://localhost:${PORT}`)
})
