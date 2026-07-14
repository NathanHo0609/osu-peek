import { getStoredCredentials, saveCredentials } from '../api/credentials'
import { attachUiSound } from './sound'

export function setupApiCredentials(container: HTMLElement): void {
  const idInput = container.querySelector<HTMLInputElement>('#osu-client-id')!
  const secretInput = container.querySelector<HTMLInputElement>('#osu-client-secret')!
  const saveBtn = container.querySelector<HTMLButtonElement>('#save-credentials')!
  const statusEl = container.querySelector<HTMLParagraphElement>('#credentials-status')!

  attachUiSound(saveBtn)

  const stored = getStoredCredentials()
  if (stored) {
    idInput.value = stored.clientId
    secretInput.value = stored.clientSecret
    statusEl.textContent = 'Using credentials saved in this browser.'
  }

  saveBtn.addEventListener('click', () => {
    const clientId = idInput.value.trim()
    const clientSecret = secretInput.value.trim()
    if (!clientId || !clientSecret) {
      statusEl.textContent = 'Enter both a client ID and client secret.'
      return
    }
    saveCredentials(clientId, clientSecret)
    statusEl.textContent = 'Saved — credentials stay in this browser only.'
  })
}
