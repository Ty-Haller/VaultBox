import type { VaultBoxState } from '../types'
import { seedData } from '../data/seed'

const STORAGE_KEY = 'vaultbox-state-v1'

export function loadState(): VaultBoxState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as VaultBoxState
  } catch {
    /* fall through to seed */
  }
  return seedData
}

export function saveState(state: VaultBoxState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState(): VaultBoxState {
  localStorage.removeItem(STORAGE_KEY)
  return seedData
}