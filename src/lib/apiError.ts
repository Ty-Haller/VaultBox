/** Turn raw API error bodies into short user-facing messages. */
export function formatApiError(body: string, status: number): string {
  const trimmed = body.trim()
  if (!trimmed) return `Request failed (${status})`

  try {
    const json = JSON.parse(trimmed) as { detail?: string; error?: string }
    if (json.detail) return json.detail
    if (json.error) return json.error
  } catch {
    // not JSON
  }

  if (trimmed.startsWith('<')) {
    const exception = trimmed.match(/class="exception_value">([^<]+)</)?.[1]
    if (exception) return exception
    const title = trimmed.match(/<title>([^<]+)<\/title>/i)?.[1]
    if (title) return title.replace(/ at \/api\/.*/, '')
    return `Server error (${status})`
  }

  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed
}