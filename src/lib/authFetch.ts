let csrfToken: string | null = null

export async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  const res = await fetch('/api/auth/csrf/', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch CSRF token')
  const data = (await res.json()) as { csrfToken: string }
  csrfToken = data.csrfToken
  return csrfToken
}

export function clearCsrfToken() {
  csrfToken = null
}

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  const method = (options.method ?? 'GET').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await ensureCsrfToken()
    headers.set('X-CSRFToken', token)
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }
  }

  return fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  })
}