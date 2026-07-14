import JSZip from 'jszip'
import { parseComboColors } from './skinIni'

export interface LoadedSkin {
  hitcircle?: HTMLImageElement
  hitcircleoverlay?: HTMLImageElement
  approachcircle?: HTMLImageElement
  reversearrow?: HTMLImageElement
  sliderBallFrames: HTMLImageElement[]
  spinnerBackground?: HTMLImageElement
  spinnerCircle?: HTMLImageElement
  digits: (HTMLImageElement | undefined)[]
  comboColors?: string[]
}

function findEntry(zip: JSZip, filename: string): JSZip.JSZipObject | undefined {
  const lower = filename.toLowerCase()
  return Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith(lower))
}

async function loadImage(zip: JSZip, key: string): Promise<HTMLImageElement | undefined> {
  const entry = findEntry(zip, `${key}@2x.png`) ?? findEntry(zip, `${key}.png`)
  if (!entry) return undefined

  const blob = await entry.async('blob')
  const url = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to decode skin image "${key}"`))
    img.src = url
  })
}

// Pragmatic v1 element subset: the pieces that visibly matter most for a layout preview.
// Cursor/judgement/song-select/other-mode elements are intentionally out of scope.
export async function loadSkin(file: Blob): Promise<LoadedSkin> {
  const zip = await JSZip.loadAsync(file)

  const [hitcircle, hitcircleoverlay, approachcircle, reversearrow, spinnerBackground, spinnerCircle] =
    await Promise.all([
      loadImage(zip, 'hitcircle'),
      loadImage(zip, 'hitcircleoverlay'),
      loadImage(zip, 'approachcircle'),
      loadImage(zip, 'reversearrow'),
      loadImage(zip, 'spinner-background'),
      loadImage(zip, 'spinner-circle'),
    ])

  const digits = await Promise.all(Array.from({ length: 10 }, (_, i) => loadImage(zip, `default-${i}`)))

  const sliderBallFrames: HTMLImageElement[] = []
  for (let i = 0; i < 10; i++) {
    const frame = await loadImage(zip, `sliderb${i}`)
    if (!frame) break
    sliderBallFrames.push(frame)
  }
  if (sliderBallFrames.length === 0) {
    const bare = await loadImage(zip, 'sliderb')
    if (bare) sliderBallFrames.push(bare)
  }

  const iniEntry = findEntry(zip, 'skin.ini')
  const comboColors = iniEntry ? parseComboColors(await iniEntry.async('text')) : undefined

  return {
    hitcircle,
    hitcircleoverlay,
    approachcircle,
    reversearrow,
    sliderBallFrames,
    spinnerBackground,
    spinnerCircle,
    digits,
    comboColors,
  }
}
