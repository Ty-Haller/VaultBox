const STORAGE_KEY = 'vaultbox-theme'

export type ThemePreference = 'light' | 'dark' | 'system'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

let systemListener: (() => void) | null = null

export function applyTheme(pref: ThemePreference) {
  const resolved = resolveTheme(pref)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.dataset.theme = resolved
  localStorage.setItem(STORAGE_KEY, pref)

  if (systemListener) {
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', systemListener)
    systemListener = null
  }
  if (pref === 'system') {
    systemListener = () => {
      const next = systemPrefersDark() ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.documentElement.dataset.theme = next
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', systemListener)
  }
}

export function loadStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'light'
}