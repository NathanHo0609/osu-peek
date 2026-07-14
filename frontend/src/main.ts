import './style.css'
import { lookupBeatmap, fetchBeatmapFile, audioPreviewUrl, fullAudioUrl, type BeatmapLookupResult } from './api/client'
import { setupBeatmapForm } from './ui/beatmapForm'
import { parseBeatmap, summarizeBeatmap, toStandardBeatmap } from './beatmap/parser'
import { ModBitwise, type Beatmap } from 'osu-classes'
import { AudioController } from './audio/audioController'
import { startPlayback, type PlaybackHandle } from './render/renderLoop'
import { fitCanvasToContainer } from './render/canvas'
import type { StandardBeatmap } from 'osu-standard-stable'
import { setupControls, type Controls } from './ui/controls'
import { setupSkinPanel } from './ui/skinPanel'
import type { LoadedSkin } from './skin/skinLoader'
import { setupMods, type ModsController } from './ui/mods'
import { setupApiCredentials } from './ui/apiCredentials'
import { attachUiSound, playToggleOn, playToggleOff } from './ui/sound'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1>osu!Peek</h1>
  <p>Preview a beatmap's layout before you download it.</p>

  <details class="api-credentials">
    <summary>osu! API credentials (required, one-time setup)</summary>
    <p class="muted">
      Register a free OAuth app at
      <a href="https://osu.ppy.sh/home/account/edit#new-oauth-application" target="_blank" rel="noopener">
        osu.ppy.sh/home/account/edit
      </a> (any name/URL works, no approval needed), then paste its Client ID and Client Secret below.
      Stored only in this browser — never sent anywhere but this app's own backend.
    </p>
    <input id="osu-client-id" type="text" placeholder="Client ID" />
    <input id="osu-client-secret" type="password" placeholder="Client Secret" />
    <button id="save-credentials" class="slant-btn">Save</button>
    <p id="credentials-status" class="muted"></p>
  </details>

  <form id="beatmap-form">
    <input name="query" type="text" placeholder="Paste a beatmap or beatmapset URL, or an ID" size="50" />
    <button type="submit" class="slant-btn">Preview</button>
  </form>

  <p id="status"></p>

  <div class="skin-panel">
    <h3>Skins</h3>
    <div id="skin-list" class="skin-list"></div>
    <label class="skin-add-btn slant-btn">
      + Add skin
      <input id="skin-input" type="file" accept=".osk" hidden />
    </label>
    <p id="skin-status" class="muted"></p>
  </div>

  <div id="result"></div>
`

const form = document.querySelector<HTMLFormElement>('#beatmap-form')!
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!
const resultEl = document.querySelector<HTMLDivElement>('#result')!

attachUiSound(form.querySelector<HTMLButtonElement>('button[type="submit"]')!)
setupApiCredentials(document.body)

let currentSkin: LoadedSkin | null = null
setupSkinPanel(document.body, (skin) => {
  currentSkin = skin
  if (currentParsedBeatmap) {
    rebuildPlayback({
      timeMs: currentPlayback?.getMapTimeMs() ?? 0,
      playing: currentPlayback?.isPlaying() ?? false,
      rate: currentPlayback?.getSpeed() ?? 1,
    })
  }
})

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
      <li>CS <span id="stat-cs">${beatmap.cs}</span></li>
      <li>AR <span id="stat-ar">${beatmap.ar}</span></li>
      <li>OD <span id="stat-od">${beatmap.od}</span></li>
      <li>HP <span id="stat-hp">${beatmap.hp}</span></li>
      <li>${beatmap.bpm} BPM</li>
      <li>${formatLength(beatmap.totalLengthSeconds)}</li>
    </ul>
    ${beatmap.difficultyCount ? `<p class="muted">${beatmap.difficultyCount} difficulties in this set — showing the hardest.</p>` : ''}
    <p id="parse-summary" class="muted">Parsing beatmap file...</p>
    <canvas id="playfield"></canvas>
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
let currentBaseStats: { cs: number; ar: number; od: number; hp: number } | null = null
let currentAudioObjectUrl: string | null = null

// Tries the full song from a free community mirror first (osu!'s own download endpoint
// is restricted to the real game client); falls back to the short official preview clip
// if the mirror doesn't have it or is unreachable.
async function resolveAudioSource(
  beatmapsetId: number,
  previewStartMs: number,
): Promise<{ src: string; startMs: number; isFull: boolean }> {
  try {
    const response = await fetch(fullAudioUrl(beatmapsetId))
    if (!response.ok) throw new Error('mirror unavailable')
    const blob = await response.blob()
    currentAudioObjectUrl = URL.createObjectURL(blob)
    return { src: currentAudioObjectUrl, startMs: 0, isFull: true }
  } catch {
    return { src: audioPreviewUrl(beatmapsetId), startMs: previewStartMs, isFull: false }
  }
}

function updateStatDisplay(standard: StandardBeatmap): void {
  const fields: [string, number, number | undefined][] = [
    ['stat-cs', standard.difficulty.circleSize, currentBaseStats?.cs],
    ['stat-ar', standard.difficulty.approachRate, currentBaseStats?.ar],
    ['stat-od', standard.difficulty.overallDifficulty, currentBaseStats?.od],
    ['stat-hp', standard.difficulty.drainRate, currentBaseStats?.hp],
  ]
  for (const [id, value, base] of fields) {
    const el = document.querySelector<HTMLSpanElement>(`#${id}`)
    if (!el) continue
    el.textContent = value.toFixed(1)
    el.classList.toggle('stat-modified', base !== undefined && Math.abs(value - base) > 0.05)
  }
}

function rebuildPlayback(preserve?: { timeMs: number; playing: boolean; rate: number }): void {
  if (!currentParsedBeatmap || !currentCanvas || !currentAudio) return

  currentPlayback?.destroy()

  const playBtn = document.querySelector<HTMLButtonElement>('#play-btn')!
  let wasPlaying = preserve?.playing ?? false

  const modsBitwise = modsController?.bitwise() ?? 0
  const hidden = (modsBitwise & ModBitwise.Hidden) !== 0
  const standard = toStandardBeatmap(currentParsedBeatmap, modsBitwise)
  updateStatDisplay(standard)
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
  if (currentAudioObjectUrl) URL.revokeObjectURL(currentAudioObjectUrl)
  currentPlayback = null
  currentAudio = null
  currentAudioObjectUrl = null
  currentParsedBeatmap = null
  currentCanvas = null
  modsController = null
  controls = null
  currentBaseStats = null

  statusEl.textContent = 'Loading...'
  resultEl.innerHTML = ''
  try {
    const beatmap = await lookupBeatmap(query)
    statusEl.textContent = ''
    currentBaseStats = { cs: beatmap.cs, ar: beatmap.ar, od: beatmap.od, hp: beatmap.hp }
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
      fitCanvasToContainer(currentCanvas)
      // If PreviewTime isn't set in the beatmap, osu! itself defaults to 40% into the track.
      const previewStartMs =
        parsed.general.previewTime >= 0 ? parsed.general.previewTime : summary.lastObjectTimeMs * 0.4

      parseSummaryEl.textContent += ' Loading full song...'
      const audioSource = await resolveAudioSource(beatmap.beatmapsetId, previewStartMs)
      parseSummaryEl.textContent =
        `Parsed ${summary.objectCount} hit objects, from ${summary.firstObjectTimeMs}ms to ` +
        `${summary.lastObjectTimeMs}ms, across ${summary.timingPointCount} timing points. ` +
        (audioSource.isFull ? 'Playing the full song.' : "Full song unavailable — using the short preview clip.")
      currentAudio = new AudioController(audioSource.src, audioSource.startMs)

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

window.addEventListener('resize', () => {
  if (!currentCanvas) return
  fitCanvasToContainer(currentCanvas)
  if (currentPlayback) currentPlayback.seek(currentPlayback.getMapTimeMs())
})
