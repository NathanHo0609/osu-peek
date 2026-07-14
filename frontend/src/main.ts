import './style.css'
import { lookupBeatmap, fetchBeatmapFile, audioPreviewUrl, type BeatmapLookupResult } from './api/client'
import { setupBeatmapForm } from './ui/beatmapForm'
import { parseBeatmap, summarizeBeatmap, toStandardBeatmap } from './beatmap/parser'
import { ModBitwise, type Beatmap } from 'osu-classes'
import { AudioController } from './audio/audioController'
import { startPlayback, type PlaybackHandle } from './render/renderLoop'
import { setupControls, type Controls } from './ui/controls'
import { setupSkinUpload } from './ui/skinUpload'
import type { LoadedSkin } from './skin/skinLoader'
import { setupMods, type ModsController } from './ui/mods'
import { attachUiSound, playToggleOn, playToggleOff } from './ui/sound'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1>osu!Peek</h1>
  <p>Preview a beatmap's layout before you download it.</p>

  <form id="beatmap-form">
    <input name="query" type="text" placeholder="Paste a beatmap or beatmapset URL, or an ID" size="50" />
    <button type="submit" class="slant-btn">Preview</button>
  </form>

  <p id="status"></p>

  <label class="skin-upload">
    Skin (optional): <input id="skin-input" type="file" accept=".osk" />
  </label>
  <p id="skin-status" class="muted"></p>

  <div id="result"></div>
`

const form = document.querySelector<HTMLFormElement>('#beatmap-form')!
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!
const resultEl = document.querySelector<HTMLDivElement>('#result')!

attachUiSound(form.querySelector<HTMLButtonElement>('button[type="submit"]')!)

let currentSkin: LoadedSkin | null = null
setupSkinUpload(
  document.querySelector<HTMLInputElement>('#skin-input')!,
  document.querySelector<HTMLParagraphElement>('#skin-status')!,
  (skin) => {
    currentSkin = skin
  },
)

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
    <div class="playback-controls">
      <button id="play-btn" class="slant-btn" disabled>&#9654; Play</button>
      <input id="seek-bar" type="range" min="0" max="1000" value="0" />
      <span id="time-label">0:00 / 0:00</span>
      <div class="mod-buttons">
        <button class="mod-btn" data-mod="EZ">EZ</button>
        <button class="mod-btn" data-mod="HR">HR</button>
        <button class="mod-btn" data-mod="HD">HD</button>
        <button class="mod-btn" data-mod="HT">HT</button>
        <button class="mod-btn" data-mod="DT">DT</button>
      </div>
      <label class="rate-control">
        Speed <input id="rate-slider" type="range" min="1" max="2" step="0.05" value="1" />
        <span id="rate-label">1.00x</span>
      </label>
      <label class="volume-control">
        &#128266; <input id="volume-slider" type="range" min="0" max="100" value="50" />
      </label>
    </div>
  `
}

let currentPlayback: PlaybackHandle | null = null
let currentAudio: AudioController | null = null
let currentParsedBeatmap: Beatmap | null = null
let currentCanvas: HTMLCanvasElement | null = null
let modsController: ModsController | null = null
let controls: Controls | null = null

function rebuildPlayback(preserve?: { timeMs: number; playing: boolean; rate: number }): void {
  if (!currentParsedBeatmap || !currentCanvas || !currentAudio) return

  currentPlayback?.destroy()

  const playBtn = document.querySelector<HTMLButtonElement>('#play-btn')!
  let wasPlaying = preserve?.playing ?? false

  const modsBitwise = modsController?.bitwise() ?? 0
  const hidden = (modsBitwise & ModBitwise.Hidden) !== 0
  const standard = toStandardBeatmap(currentParsedBeatmap, modsBitwise)
  currentPlayback = startPlayback(currentCanvas, standard, currentAudio, currentSkin ?? undefined, hidden, {
    onTick: (mapTimeMs, maxTimeMs) => {
      controls?.onTick(mapTimeMs, maxTimeMs)
      const nowPlaying = currentPlayback!.isPlaying()
      if (nowPlaying !== wasPlaying) {
        wasPlaying = nowPlaying
        playBtn.innerHTML = nowPlaying ? '&#10074;&#10074; Pause' : '&#9654; Play'
        if (nowPlaying) playToggleOn()
        else playToggleOff()
      }
    },
  })

  currentPlayback.setSpeed(preserve?.rate ?? 1)
  if (preserve) {
    currentPlayback.seek(preserve.timeMs)
    if (preserve.playing) currentPlayback.play()
  }
  playBtn.innerHTML = wasPlaying ? '&#10074;&#10074; Pause' : '&#9654; Play'
}

setupBeatmapForm(form, async (query) => {
  currentPlayback?.destroy()
  currentAudio?.destroy()
  currentPlayback = null
  currentAudio = null
  currentParsedBeatmap = null
  currentCanvas = null
  modsController = null
  controls = null

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

      currentParsedBeatmap = parsed
      currentCanvas = document.querySelector<HTMLCanvasElement>('#playfield')!
      // If PreviewTime isn't set in the beatmap, osu! itself defaults to 40% into the track.
      const previewStartMs =
        parsed.general.previewTime >= 0 ? parsed.general.previewTime : summary.lastObjectTimeMs * 0.4
      currentAudio = new AudioController(audioPreviewUrl(beatmap.beatmapsetId), previewStartMs)

      controls = setupControls(resultEl)
      controls.bind(() => currentPlayback)

      const playBtn = document.querySelector<HTMLButtonElement>('#play-btn')!
      attachUiSound(playBtn, { click: false })
      playBtn.addEventListener('click', () => {
        if (!currentPlayback) return
        if (currentPlayback.isPlaying()) {
          currentPlayback.pause()
        } else {
          currentPlayback.play()
        }
      })

      modsController = setupMods(
        resultEl,
        () => {
          rebuildPlayback({
            timeMs: currentPlayback?.getMapTimeMs() ?? 0,
            playing: currentPlayback?.isPlaying() ?? false,
            rate: currentPlayback?.getSpeed() ?? 1,
          })
        },
        (rate) => {
          currentPlayback?.setSpeed(rate)
        },
      )

      rebuildPlayback()
      playBtn.disabled = false
    } catch (err) {
      parseSummaryEl.textContent =
        err instanceof Error ? `Beatmap file parse failed: ${err.message}` : 'Beatmap file parse failed.'
    }
  } catch (err) {
    statusEl.textContent = err instanceof Error ? err.message : 'Something went wrong.'
  }
})
