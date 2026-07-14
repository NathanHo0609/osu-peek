interface CachedToken {
  token: string
  expiresAt: number
}

let cachedToken: CachedToken | null = null

export async function getOsuAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token
  }

  const response = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.OSU_CLIENT_ID,
      client_secret: process.env.OSU_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  })

  if (!response.ok) {
    throw new Error(`osu! OAuth token request failed: ${response.status}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 }
  return cachedToken.token
}
