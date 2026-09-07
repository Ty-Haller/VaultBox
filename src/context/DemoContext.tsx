import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchDemoStatus, type DemoStatus } from '../lib/demoApi'
import { useAuth } from './AuthContext'
import { clearCsrfToken } from '../lib/authFetch'

interface DemoContextValue extends DemoStatus {
  loading: boolean
  refresh: () => Promise<void>
  remainingMs: number
  resetting: boolean
}

const DemoContext = createContext<DemoContextValue | null>(null)

const EMPTY: DemoStatus = { publicDemo: false, resetsEverySeconds: 0, nextResetAt: null, resetting: false }

export function DemoProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const [status, setStatus] = useState<DemoStatus>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const prevDeadline = useRef<string | null>(null)
  const cycling = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const next = await fetchDemoStatus()
      setStatus(next)
    } catch {
      // Keep the last good payload so the banner does not vanish on a blip.
    } finally {
      setLoading(false)
    }
  }, [])

  const remainingMs = useMemo(() => {
    if (!status.nextResetAt) return 0
    const target = Date.parse(status.nextResetAt)
    if (Number.isNaN(target)) return 0
    return Math.max(0, target - now)
  }, [status.nextResetAt, now])

  const resetting = Boolean(status.resetting) || (status.publicDemo && remainingMs === 0 && Boolean(status.nextResetAt))

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!status.publicDemo) return
    const intervalMs = remainingMs <= 15_000 || resetting ? 1000 : 10_000
    const poll = window.setInterval(() => { void refresh() }, intervalMs)
    return () => window.clearInterval(poll)
  }, [status.publicDemo, remainingMs, resetting, refresh])

  useEffect(() => {
    if (!status.publicDemo || !status.nextResetAt) return
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [status.publicDemo, status.nextResetAt])

  useEffect(() => {
    const next = status.nextResetAt
    const prev = prevDeadline.current
    if (prev && next && next !== prev) {
      const prevTime = Date.parse(prev)
      const nextTime = Date.parse(next)
      if (!Number.isNaN(prevTime) && !Number.isNaN(nextTime) && nextTime > prevTime && !cycling.current) {
        cycling.current = true
        const kickToLogin = async () => {
          try {
            if (user) await logout()
            else {
              clearCsrfToken()
            }
          } finally {
            if (window.location.pathname !== '/login') {
              window.location.assign('/login')
            } else {
              window.location.reload()
            }
          }
        }
        void kickToLogin()
      }
    }
    if (next) prevDeadline.current = next
  }, [status.nextResetAt, user, logout])

  const value = useMemo(
    () => ({ ...status, loading, refresh, remainingMs, resetting }),
    [status, loading, refresh, remainingMs, resetting],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
