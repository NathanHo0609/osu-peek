import 'dotenv/config'
import express from 'express'

const app = express()
const PORT = process.env.PORT ?? 3001

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`osu!Peek backend listening on http://localhost:${PORT}`)
})
