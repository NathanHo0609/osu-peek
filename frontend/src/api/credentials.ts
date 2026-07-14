const STORAGE_KEY_ID = 'osu-client-id'
const STORAGE_KEY_SECRET = 'osu-client-secret'

export interface OsuCredentials {
  clientId: string
  clientSecret: string
}

export function getStoredCredentials(): OsuCredentials | null {
  const clientId = localStorage.getItem(STORAGE_KEY_ID)
  const clientSecret = localStorage.getItem(STORAGE_KEY_SECRET)
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function saveCredentials(clientId: string, clientSecret: string): void {
  localStorage.setItem(STORAGE_KEY_ID, clientId)
  localStorage.setItem(STORAGE_KEY_SECRET, clientSecret)
}

export function credentialHeaders(): HeadersInit {
  const credentials = getStoredCredentials()
  if (!credentials) return {}
  return {
    'X-Osu-Client-Id': credentials.clientId,
    'X-Osu-Client-Secret': credentials.clientSecret,
  }
}
