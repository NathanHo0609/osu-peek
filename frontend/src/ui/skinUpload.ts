import { loadSkin, type LoadedSkin } from '../skin/skinLoader'

export function setupSkinUpload(
  input: HTMLInputElement,
  statusEl: HTMLElement,
  onLoaded: (skin: LoadedSkin | null) => void,
): void {
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return

    statusEl.textContent = `Loading skin "${file.name}"...`
    try {
      const skin = await loadSkin(file)
      statusEl.textContent = `Skin "${file.name}" loaded — applies next time you load a map.`
      onLoaded(skin)
    } catch (err) {
      statusEl.textContent = err instanceof Error ? `Failed to load skin: ${err.message}` : 'Failed to load skin.'
      onLoaded(null)
    }
  })
}
