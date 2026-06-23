import type { AuditLineItem } from '../types'

export type AuditLineState = AuditLineItem & { sessionQty: string }

export function toLineState(item: AuditLineItem): AuditLineState {
  return {
    ...item,
    currentCount: item.currentCount ?? null,
    sessionQty: '',
  }
}

export function parseSessionQty(raw: string): number | undefined {
  if (raw === '' || raw === '-') return undefined
  const n = parseInt(raw, 10)
  return Number.isNaN(n) ? undefined : n
}

/** Count that would be committed on complete, including unsaved session adjustments. */
export function effectiveCountForLine(line: AuditLineState): number | null {
  const sessionQty = parseSessionQty(line.sessionQty)
  const hasSession = sessionQty != null && sessionQty !== 0
  const hasCurrent = line.currentCount !== null && line.currentCount !== undefined

  if (hasCurrent && hasSession) {
    return line.currentCount!
  }
  if (hasSession) {
    return Math.max(0, (line.currentCount ?? 0) + sessionQty!)
  }
  if (hasCurrent) {
    return line.currentCount!
  }
  return null
}

export function isLineCounted(line: AuditLineState): boolean {
  return effectiveCountForLine(line) !== null
}

export function buildAuditPayload(
  lines: AuditLineState[],
  performedBy: string,
  notes: string,
  mode: 'save' | 'complete'
) {
  return {
    performedBy,
    notes,
    lineItems: lines.map((l) => {
      const sessionQty = parseSessionQty(l.sessionQty)
      if (mode === 'save') {
        if (sessionQty != null && sessionQty !== 0) return { id: l.id, sessionQty }
        return { id: l.id, currentCount: l.currentCount }
      }
      const item: {
        id: string
        sessionQty?: number
        currentCount?: number | null
      } = { id: l.id }
      if (sessionQty != null && sessionQty !== 0) item.sessionQty = sessionQty
      if (l.currentCount !== null && l.currentCount !== undefined) {
        item.currentCount = l.currentCount
      }
      return item
    }),
  }
}