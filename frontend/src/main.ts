import './style.css'
import { lookupBeatmap, fetchBeatmapFile, audioPreviewUrl, type BeatmapLookupResult } from './api/client'
import { setupBeatmapForm } from './ui/beatmapForm'
import { parseBeatmap, summarizeBeatmap } from './beatmap/parser'
import { AudioController } from './audio/audioController'
import { startPlayback, type PlaybackHandle } from './render/renderLoop'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1>osu!Peek</h1>
  <p>Preview a beatmap's layout before you download it.</p>

  <form id="beatmap-form">
    <input name="query" type="text" placeholder="Paste a beatmap or beatmapset URL, or an ID" size="50" />
    <button type="submit">Preview</button>
  </form>

  <p id="status"></p>
  <div id="result"></div>
`

const form = document.querySelector<HTMLFormElement>('#beatmap-form')!
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!
const resultEl = document.querySelector<HTMLDivElement>('#result')!

function formatLength(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function renderResult(beatmap: BeatmapLookupResult): void {
  resultEl.innerHTML = `
    <img src="${beatmap.coverUrl}" alt="" class="cover" />
    <h2>${beatmap.artist} - ${beatmap.title}</h2>
    <p>Mapped by ${beatmap.creator} &mdash; [${beatmap.version}]</p>
    <ul class="stats">
      <li>★ ${beatmap.difficultyRating.toFixed(2)}</li>
      <li>CS ${beatmap.cs}</li>
      <li>AR ${beatmap.ar}</li>
      <li>OD ${beatmap.od}</li>
      <li>HP ${beatmap.hp}</li>
      <li>${beatmap.bpm} BPM</li>
      <li>${formatLength(beatmap.totalLengthSeconds)}</li>
    </ul>
    ${beatmap.difficultyCount ? `<p class="muted">${beatmap.difficultyCount} difficulties in this set — showing the hardest.</p>` : ''}
    <p id="parse-summary" class="muted">Parsing beatmap file...</p>
    <canvas id="playfield" width="640" height="480"></canvas>
    <div>
      <button id="play-btn" disabled>&#9654; Play</button>
    </div>
  `
}

let currentPlayback: PlaybackHandle | null = null
let currentAudio: AudioController | null = null

setupBeatmapForm(form, async (query) => {
  currentPlayback?.destroy()
  currentAudio?.destroy()
  currentPlayback = null
  currentAudio = null

  statusEl.textContent = 'Loading...'
  resultEl.innerHTML = ''
  try {
    const beatmap = await lookupBeatmap(query)
    statusEl.textContent = ''
    renderResult(beatmap)

    const parseSummaryEl = document.querySelector<HTMLParagraphElement>('#parse-summary')!
    try {
      const fileText = await fetchBeatmapFile(beatmap.beatmapId)
      const parsed = parseBeatmap(fileText)
      const summary = summarizeBeatmap(parsed)
      parseSummaryEl.textContent =
        `Parsed ${summary.objectCount} hit objects, from ${summary.firstObjectTimeMs}ms to ` +
        `${summary.lastObjectTimeMs}ms, across ${summary.timingPointCount} timing points.`

      const canvas = document.querySelector<HTMLCanvasElement>('#playfield')!
      // If PreviewTime isn't set in the beatmap, osu! itself defaults to 40% into the track.
      const previewStartMs =
        parsed.general.previewTime >= 0 ? parsed.general.previewTime : summary.lastObjectTimeMs * 0.4

      currentAudio = new AudioController(audioPreviewUrl(beatmap.beatmapsetId), previewStartMs)
      currentPlayback = startPlayback(canvas, parsed, currentAudio)

      const playBtn = document.querySelector<HTMLButtonElement>('#play-btn')!
      playBtn.disabled = false
      playBtn.addEventListener('click', () => {
        if (!currentPlayback) return
        if (currentPlayback.isPlaying()) {
          currentPlayback.pause()
          playBtn.innerHTML = '&#9654; Play'
        } else {
          currentPlayback.play()
          playBtn.innerHTML = '&#10074;&#10074; Pause'
        }
      })
    } catch (err) {
      parseSummaryEl.textContent =
        err instanceof Error ? `Beatmap file parse failed: ${err.message}` : 'Beatmap file parse failed.'
    }
  } catch (err) {
    statusEl.textContent = err instanceof Error ? err.message : 'Something went wrong.'
  }
})
