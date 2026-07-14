interface CachedToken {
  token: string
  expiresAt: number
}

// Keyed by client ID so each visitor's own osu! OAuth app gets its own cached token,
// rather than one shared token whose quota everyone competes for.
const tokenCache = new Map<string, CachedToken>()

export async function getOsuAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now()
  const cached = tokenCache.get(clientId)
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.token
  }

  const response = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  })

  if (!response.ok) {
    throw new Error(`osu! OAuth token request failed: ${response.status}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  const entry = { token: data.access_token, expiresAt: now + data.expires_in * 1000 }
  tokenCache.set(clientId, entry)
  return entry.token
}
