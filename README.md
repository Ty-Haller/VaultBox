# VaultBox

<p align="left">
  <img src="docs/brand/logo.png" alt="VaultBox" width="72" height="72">
</p>

**Hard asset inventory** for bullion, crypto, and other vaulted goods. Local-first: you run it on your machine. It is not a public internet service.

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
- **Notifications** — Event engine with in-app, email (SMTP), and [Apprise](https://github.com/caronc/apprise) (Discord, Slack, Telegram, and other URL targets)
- **Alerts** — Spot/market % change and price above/below; vault audit due/overdue and capacity; holding gain/loss; insurance expiry; plus audit, admin, and inventory events
- **QR labels** — Per holding; lookup at `/lookup/:code`
- **Backups** — On-demand and scheduled SQLite + media archives (optional encryption + rclone)
- **Secrets** — Encrypted seed phrases and recovery data
- **Admin** — NetBox-style taxonomy, users, roles

## Screenshots

Captured from the local demo at [http://localhost:5173](http://localhost:5173). Passkeys fail on `127.0.0.1`.

**Login** — VaultBox, Hard Asset Inventory, passkey sign-in.

![Login](docs/screenshots/login.png)

**Dashboard** — portfolio totals, charts, and the live price ticker.

![Dashboard](docs/screenshots/dashboard.png)

**Inventory** — holdings table with filters and CSV export.

![Inventory](docs/screenshots/inventory.png)

**Vault** — one vault: audit status, utilization, holdings.

![Vault detail](docs/screenshots/vault.png)

**Reports** — PDFs plus purchases & sales (all-time).

![Reports](docs/screenshots/reports.png)

**Admin** — taxonomy, users, backups, SSO.

![Admin](docs/screenshots/admin.png)

**Notification defaults** — system event catalog and default channels (in-app, email, Apprise).

![Notification defaults](docs/screenshots/notifications-catalog.png)

**Role defaults** — per-role subscriptions for the notification engine.

![Role notification defaults](docs/screenshots/notifications-roles.png)

**Notification preferences** — which alerts you get and how they are delivered.

![Notification preferences](docs/screenshots/notifications-prefs.png)

**Apprise** — pick Discord, Slack, Telegram, and other URL targets (no secrets in this shot).

![Apprise setup](docs/screenshots/apprise-setup.png)

**Market alerts** — % change and price above/below on an instrument; delivery is in user preferences.

![Market alerts](docs/screenshots/market-alerts.png)

**SMTP delivery** — admin relay for email notifications.

![SMTP delivery](docs/screenshots/notifications-smtp.png)

## Authentication

Passkey login is always on. SSO is optional under **Admin → SSO / OAuth**. Callback URL:

`{backend-base}/api/auth/oauth/{provider-id}/callback/`

Set the public hostname in `.env` (`VAULTBOX_HOSTNAME`, optional `VAULTBOX_USE_HTTPS=true`) or under **Admin → Site & Hostname**. Open the **App URL** shown on that page — passkeys fail if the browser host does not match the RP ID. `localhost` keeps ports 5173 / 8000; `127.0.0.1` is not valid for passkeys. Changing the hostname/RP ID requires re-registering passkeys.

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

**Backend:** Django 6.1, Django REST Framework, SQLite, Pillow, ReportLab, qrcode, webauthn, cryptography, Apprise

## Security

See [SECURITY.md](SECURITY.md). This tree is meant to stay on localhost or a private network — not on the public internet.
