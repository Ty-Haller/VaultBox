/** AbortSignal.timeout polyfill for environments that lack it. */
export function fetchTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(ms)
  }
  const controller = new AbortController()
  setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms)
  return controller.signal
}