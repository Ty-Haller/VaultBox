import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { applyTheme, loadStoredTheme } from './lib/theme'
import { ensureLocalhostForWebAuthn } from './lib/webauthnHost'

function showBootError(message: string) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML = `
    <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;background:#f4f6f8;padding:24px">
      <div style="max-width:480px;border:1px solid #fecaca;background:#fff;border-radius:8px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <h1 style="margin:0 0 8px;font-size:18px;color:#b91c1c">VaultBox failed to start</h1>
        <p style="margin:0 0 16px;font-size:14px;color:#3d556d;line-height:1.5">${message}</p>
        <p style="margin:0;font-size:13px;color:#5a7a96">Try: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">npm run start</code> then open <a href="http://localhost:5173" style="color:#c9a227">http://localhost:5173</a></p>
      </div>
    </div>
  `
}

window.addEventListener('error', (event) => {
  if (event.message && !document.getElementById('root')?.querySelector('[data-vaultbox-app]')) {
    showBootError(event.message)
  }
})

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason instanceof Error ? event.reason.message : String(event.reason)
  if (!document.getElementById('root')?.querySelector('[data-vaultbox-app]')) {
    showBootError(msg)
  }
})

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Missing #root element')
}

if (ensureLocalhostForWebAuthn()) {
  rootEl.innerHTML = '<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;color:#5a7a96">Redirecting to localhost for passkey sign-in…</div>'
} else {
  applyTheme(loadStoredTheme())
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <div data-vaultbox-app>
            <App />
          </div>
        </ErrorBoundary>
      </StrictMode>,
    )
  } catch (err) {
    showBootError(err instanceof Error ? err.message : 'Unknown startup error')
  }
}