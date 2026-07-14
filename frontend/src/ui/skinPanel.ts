import { loadSkin, type LoadedSkin } from '../skin/skinLoader'
import { saveSkin, listSkins, getSkinBlob, deleteSkin, type StoredSkinMeta } from '../skin/skinStorage'
import { attachUiSound } from './sound'

const ACTIVE_SKIN_KEY = 'osu-peek-active-skin-id'

export function setupSkinPanel(container: HTMLElement, onSkinChanged: (skin: LoadedSkin | null) => void): void {
  const listEl = container.querySelector<HTMLDivElement>('#skin-list')!
  const fileInput = container.querySelector<HTMLInputElement>('#skin-input')!
  const statusEl = container.querySelector<HTMLParagraphElement>('#skin-status')!

  let skins: StoredSkinMeta[] = []
  let activeId: string | null = localStorage.getItem(ACTIVE_SKIN_KEY)

  async function selectSkin(id: string | null): Promise<void> {
    activeId = id
    if (id) localStorage.setItem(ACTIVE_SKIN_KEY, id)
    else localStorage.removeItem(ACTIVE_SKIN_KEY)
    render()

    if (!id) {
      onSkinChanged(null)
      return
    }

    const blob = await getSkinBlob(id)
    if (!blob) {
      statusEl.textContent = 'That saved skin is missing — try re-uploading it.'
      onSkinChanged(null)
      return
    }

    try {
      statusEl.textContent = 'Applying skin...'
      const skin = await loadSkin(blob)
      statusEl.textContent = ''
      onSkinChanged(skin)
    } catch (err) {
      statusEl.textContent = err instanceof Error ? `Failed to load skin: ${err.message}` : 'Failed to load skin.'
      onSkinChanged(null)
    }
  }

  function render(): void {
    const defaultChip = `<button type="button" class="skin-chip${activeId === null ? ' active' : ''}" data-id="">Default</button>`
    const skinChips = skins
      .map(
        (s) => `
        <button type="button" class="skin-chip${activeId === s.id ? ' active' : ''}" data-id="${s.id}">
          ${s.name}
          <span class="skin-chip-remove" data-remove="${s.id}" title="Remove">&times;</span>
        </button>`,
      )
      .join('')
    listEl.innerHTML = defaultChip + skinChips

    listEl.querySelectorAll<HTMLButtonElement>('.skin-chip').forEach((chip) => {
      attachUiSound(chip, { click: false })
      chip.addEventListener('click', (event) => {
        if ((event.target as HTMLElement).dataset.remove) return
        selectSkin(chip.dataset.id || null)
      })
    })

    listEl.querySelectorAll<HTMLSpanElement>('[data-remove]').forEach((removeBtn) => {
      removeBtn.addEventListener('click', async (event) => {
        event.stopPropagation()
        const id = removeBtn.dataset.remove!
        await deleteSkin(id)
        skins = skins.filter((s) => s.id !== id)
        if (activeId === id) {
          await selectSkin(null)
        } else {
          render()
        }
      })
    })
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return

    statusEl.textContent = `Saving "${file.name}"...`
    try {
      const name = file.name.replace(/\.osk$/i, '')
      const id = await saveSkin(name, file)
      skins.push({ id, name })
      statusEl.textContent = ''
      await selectSkin(id)
    } catch (err) {
      statusEl.textContent = err instanceof Error ? `Failed to save skin: ${err.message}` : 'Failed to save skin.'
    }
    fileInput.value = ''
  })

  listSkins().then(async (saved) => {
    skins = saved
    if (activeId && !skins.some((s) => s.id === activeId)) activeId = null
    render()
    if (activeId) await selectSkin(activeId)
  })
}
