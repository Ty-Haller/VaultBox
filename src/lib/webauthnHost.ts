/** WebAuthn/passkeys require localhost — IP addresses like 127.0.0.1 are rejected. */
export function ensureLocalhostForWebAuthn(): boolean {
  if (typeof window === 'undefined') return false
  if (window.location.hostname !== '127.0.0.1') return false
  const url = new URL(window.location.href)
  url.hostname = 'localhost'
  window.location.replace(url.toString())
  return true
}