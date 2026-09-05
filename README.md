# VaultBox

**Hard asset inventory** for bullion, crypto, and other vaulted goods. Local-first: you run it on your machine (later, on a small appliance inside the vault). It is not a public internet service.

Status: **0.1.0-beta** · private

```
Site → Vault → Holding
         ↓         ↓
      Photos    Photos + documents + QR labels
```

Passkeys (WebAuthn) are the sign-in method. Use **http://localhost:5173** — `127.0.0.1` will fail passkey registration.

## Requirements

- Python 3.11+
- Node.js 20+
- A browser that supports passkeys

## Quick start

```bash
git clone https://github.com/Ty-Haller/VaultBox.git
cd VaultBox

python3 -m pip install --user -r backend/requirements.txt
cd backend
python3 manage.py migrate
python3 manage.py seed_roles
python3 manage.py seed_admin
python3 manage.py seed_notifications
python3 manage.py seed_data          # optional demo holdings
python3 manage.py runserver          # http://127.0.0.1:8000
```

```bash
npm install
npm run dev                          # http://localhost:5173
```

First visit [http://localhost:5173/login](http://localhost:5173/login) and **Register Admin Passkey** for user `admin`. There is no password login.

On first backend start Django writes a repo-root `.env` (`SECRET_KEY`, `VAULTBOX_ENCRYPTION_KEY`, mode `0600`). Do not commit `.env`. See [`.env.example`](.env.example) and [SECURITY.md](SECURITY.md).

Reset demo inventory later from **Admin → Danger zone** (type `RESET`), or `python3 manage.py seed_data --flush`.

## Features

- **Inventory** — Site → Vault → Holding, including bullion, crypto, gems, watches
- **Passkeys** — WebAuthn; optional OIDC SSO
- **Audits** — Standard and advanced vault counts; cancelable sessions
- **Reports** — Portfolio, inventory, QR labels, purchase/sale, P/L (PDF + CSV)
- **Live prices** — Metals (and ticker crypto/stocks) with fallback warnings
- **QR labels** — Per holding; lookup at `/lookup/:code`
- **Backups** — On-demand and scheduled SQLite + media archives (optional encryption + rclone)
- **Secrets** — Encrypted seed phrases and recovery data
- **Admin** — NetBox-style taxonomy, users, roles, notifications

## Authentication

Passkey login is always on. SSO is optional under **Admin → SSO / OAuth**. Callback URL:

`{backend-base}/api/auth/oauth/{provider-id}/callback/`

Set the public hostname under **Admin → Site & Hostname**. Leave it blank for the server hostname; `localhost` keeps ports 5173 / 8000.

## Backups

**Admin → Backups**

- Plain `.tar.gz` or encrypted `.vaultbox` (AES-256-GCM). The archive password is not stored — lose it and the backup cannot be restored.
- Scheduled retention (keep N) via `python3 manage.py run_scheduled_backups`.
- Optional rclone off-site copy (`rclone` must be on `PATH`).

Keep `.env` with the database. Changing `VAULTBOX_ENCRYPTION_KEY` makes existing Fernet ciphertext (holding secrets, wrapped schedule passwords) undecryptable.

Restart the app after a restore so Django reloads SQLite.

## API (abridged)

Authenticated JSON at `/api/`. UUID primary keys.

| Resource | Path |
|----------|------|
| Sites / vaults / holdings | `/api/sites/`, `/api/vaults/`, `/api/holdings/` |
| QR lookup | `/api/lookup/{code}/` |
| PDFs | `/api/reports/{portfolio\|inventory\|labels\|purchase-sale\|profit-loss}.pdf` |
| Auth | `/api/auth/` (passkeys, CSRF, SSO) |
| Admin | `/api/admin/…` |
| Demo seed (Full Admin) | `POST /api/seed/` |

## Tech stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, React Router

**Backend:** Django 5, Django REST Framework, SQLite, Pillow, ReportLab, qrcode, webauthn, cryptography

## Security

See [SECURITY.md](SECURITY.md). This tree is meant to stay on localhost or a private appliance — not on the public internet.
