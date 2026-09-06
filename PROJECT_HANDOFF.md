# VaultBox — Session Handoff

**Last updated:** 2026-09-06  
**Status:** Local-first hard asset inventory. Not a public internet host. A vault IoT appliance is a later phase.

Use this file to resume work. `README.md` is the operator guide.

---

## Product

VaultBox: Site → Vault → Holding. React 19 + Vite UI, Django 6 REST API, SQLite.

- **Short term:** operators run it on localhost. UI **http://localhost:5173** (passkeys fail on `127.0.0.1`).
- **Long term:** a small appliance that lives inside the vault (offline-first image of this same tree). Not started.

Version: `0.1.0-beta` (`package.json`).

---

## Quick resume

```bash
cd backend && python3 manage.py migrate && python3 manage.py runserver 127.0.0.1:8000
# other terminal:
npm run dev
```

First backend start writes repo-root `.env` (`SECRET_KEY`, `VAULTBOX_ENCRYPTION_KEY`, mode `0600`) if missing.

- **App:** http://localhost:5173
- **Login:** http://localhost:5173/login — Register Admin Passkey (`admin`) on a fresh DB; existing DBs use the stored passkey
- **Admin:** http://localhost:5173/admin
- **API:** http://127.0.0.1:8000/api/

There is no password login.

Demo reset: Admin → Danger zone (type `RESET`), or `python3 manage.py seed_data --flush`. Do not put a one-click wipe on the sidebar.

---

## What landed after the 2026-06-20 handoff

- Alpha squash, then SEC-01–04 / 07b / 08 and FEAT-04–06 (price warnings, PDF timestamps, chain-balance warning)
- Re-bootstrap + cannot delete last Full Admin (`f764280`)
- Product sub-name **Hard Asset Inventory** (`5acd941`)
- Secrets loaded from `.env` (generated on first boot; no hardcoded Django keys)
- Header search → `/inventory?q=`
- Inventory reset gated in Admin (type `RESET`)

Migration drift from the June handoff is **gone** (`makemigrations --check` clean).

---

## Secrets

| Key | Where |
|-----|--------|
| `SECRET_KEY` | `.env` / environment |
| `VAULTBOX_ENCRYPTION_KEY` | `.env` / environment (Fernet for holding secrets and wrapped backup passwords) |

`.env` is gitignored. `.env.example` documents the names.

Existing DBs encrypted with the old in-repo defaults must copy those two strings into `.env` once, or re-enter secrets. Changing `VAULTBOX_ENCRYPTION_KEY` makes ciphertext decrypt to empty.

---

## Remaining (not this local beta)

- Vault appliance (hardware, offline prices, non-localhost WebAuthn RP ID)
- `DEBUG=False` / CSRF enforcement / Docker — wait until something leaves localhost
- Tests / CI / LICENSE
- `api_rate_limit` is still an unused setting
- Optional: CSV on Audits/Dashboard, charts on purchase/sale PDF

---

## Tech stack

**Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Recharts, TanStack Query, React Router 7

**Backend:** Django 6.1, DRF, SQLite, Pillow, ReportLab, qrcode, webauthn, cryptography
