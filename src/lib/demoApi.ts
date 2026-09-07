import { authFetch } from './authFetch'

export interface DemoStatus {
  publicDemo: boolean
  resetsEverySeconds: number
  nextResetAt: string | null
  resetting?: boolean
}

export async function fetchDemoStatus(): Promise<DemoStatus> {
  const res = await fetch('/api/demo-status/', { credentials: 'include' })
  if (!res.ok) {
    throw new Error('demo-status failed')
  }
  return res.json() as Promise<DemoStatus>
}

export async function startDemoAdminSession(): Promise<{ ok: boolean; username: string }> {
  const res = await authFetch('/api/auth/demo-session/', { method: 'POST' })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || 'Could not start demo session')
  }
  return res.json() as Promise<{ ok: boolean; username: string }>
}

export async function demoPasskeyBegin(): Promise<{
  options: Record<string, unknown>
  username: string
}> {
  const res = await authFetch('/api/auth/demo-passkey/register/begin/', { method: 'POST' })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || 'Could not start passkey registration')
  }
  return res.json() as Promise<{ options: Record<string, unknown>; username: string }>
}

export async function demoPasskeyFinish(
  credential: Record<string, unknown>,
  name?: string,
): Promise<{ ok: boolean; username: string }> {
  const res = await authFetch('/api/auth/demo-passkey/register/finish/', {
    method: 'POST',
    body: JSON.stringify({ credential, name }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || 'Passkey registration failed')
  }
  return res.json() as Promise<{ ok: boolean; username: string }>
}
