import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import lookupRouter from './routes/lookup.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', lookupRouter)

app.listen(PORT, () => {
  console.log(`osu!Peek backend listening on http://localhost:${PORT}`)
})
