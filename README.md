# VaultBox

A NetBox-inspired hard asset inventory system — React frontend + Django REST API backend.

VaultBox is **local-first**: you run it on your own machine (and later, on a small appliance inside the vault). It is not a public internet service.

## Architecture

```
Site → Vault → Holding
     ↓         ↓
   Photos    Photos + Documents + QR Labels
```

## Quick Start

Open the UI at **http://localhost:5173** (not `127.0.0.1` — passkeys will fail).

On first backend start Django writes a repo-root `.env` with `SECRET_KEY` and `VAULTBOX_ENCRYPTION_KEY` (mode `0600`). Do not commit `.env`. See `.env.example`.

### 1. Backend (Django REST API)

```bash
cd backend
python3 -m pip install --user -r requirements.txt
python3 manage.py migrate
python3 manage.py seed_roles
python3 manage.py seed_admin
python3 manage.py seed_notifications
python3 manage.py seed_data          # optional demo holdings; --flush replaces inventory
python3 manage.py runserver
```

API runs at **http://127.0.0.1:8000/api/**

### 2. Frontend (React + Vite)

```bash
npm install
npm run dev
```

First visit **http://localhost:5173/login** and **Register Admin Passkey** for user `admin`. There is no password login.

### Existing database (alpha hardcoded keys)

If this tree already has a `backend/db.sqlite3` encrypted with the old in-repo keys, copy them into `.env` once before generating new ones — otherwise secrets, seed phrases, and wrapped backup passwords will not decrypt:

```
SECRET_KEY=django-insecure-vaultbox-dev-key-change-in-production
VAULTBOX_ENCRYPTION_KEY=vaultbox-dev-fernet-key-change-in-prod!!
```

Changing `VAULTBOX_ENCRYPTION_KEY` later has the same effect.

## Features

- **Passkeys** — WebAuthn sign-in (optional SSO)
- **Admin Area** — NetBox-style model configuration (`/admin`)
- **Full CRUD** — Sites, Vaults, Holdings with dedicated form pages
- **REST API** — Django REST Framework with UUID primary keys
- **Photos** — Upload images to sites, vaults, or holdings
- **Documents** — Attach invoices, certificates, assay reports (PDF/images)
- **Audits** — Standard and advanced vault counts; cancelable sessions
- **PDF Reports** — Portfolio, inventory, QR labels, purchase/sale, profit & loss
- **CSV export** — Inventory and report tables
- **QR Codes** — Auto-generated per holding; scan to lookup via `/lookup/:code`
- **Live Prices** — Gold, silver, platinum, palladium (plus ticker crypto/stocks)
- **Charts** — Portfolio history, metal allocation, vault distribution
- **Backups** — On-demand and scheduled SQLite + media archives
- **Secrets** — Encrypted seed phrases and recovery data per vault

## Administration (`/admin`)

Configure all lookup models via the UI or API:

| Section | Path | Description |
|---------|------|-------------|
| Site Types | `/admin/site-types` | Location classifications |
| Vault Types | `/admin/vault-types` | Storage container types |
| Metal Types | `/admin/metal-types` | Gold, silver, platinum, etc. |
| Coin / Form Types | `/admin/coin-types` | Bars, coins, rounds |
| Currencies | `/admin/currencies` | USD, EUR, GBP... |
| Site & Hostname | `/admin/site` | Public DNS/SAN, derived URLs |
| Other Settings | `/admin/settings` | Key-value app config |
| Notifications | `/admin/notifications` | Alert rules & channels |
| Backups | `/admin/backups` | On-demand & scheduled DB/media backups |
| SSO / OAuth | `/admin/sso` | OpenID Connect login providers |
| Audit Workflows | `/admin/audit-workflows` | Review schedules |
| Users | `/admin/users` | User accounts |
| Groups | `/admin/groups` | Roles & permissions |

First-time login is passkey bootstrap for `admin` (see Quick Start). `seed_admin` only seeds lookup tables and app config:

```bash
python3 manage.py seed_admin   # seed admin config (first run only)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/sites/` | List/create sites |
| GET/PATCH/DELETE | `/api/sites/{id}/` | Site detail |
| GET/POST | `/api/vaults/` | List/create vaults |
| GET/PATCH/DELETE | `/api/vaults/{id}/` | Vault detail |
| GET/POST | `/api/holdings/` | List/create holdings |
| GET/PATCH/DELETE | `/api/holdings/{id}/` | Holding detail |
| GET | `/api/holdings/{id}/qr/` | QR code PNG |
| POST | `/api/photos/` | Upload photo (multipart) |
| POST | `/api/documents/` | Upload document (multipart) |
| GET | `/api/lookup/{code}/` | QR code lookup |
| GET | `/api/reports/{type}.pdf` | PDF export (portfolio/inventory/labels/purchase-sale/profit-loss) |
| GET | `/api/portfolio-history/` | Historical snapshots |
| POST | `/api/seed/` | Reset to seed data |
| GET/POST | `/api/admin/site-types/` | Site type config |
| GET/POST | `/api/admin/vault-types/` | Vault type config |
| GET/POST | `/api/admin/metal-types/` | Metal type config |
| GET/POST | `/api/admin/form-factor-types/` | Coin/form types |
| GET/POST | `/api/admin/currencies/` | Currency config |
| GET/POST | `/api/admin/settings/` | App settings |
| GET/POST | `/api/admin/notification-options/` | Notification rules |
| GET/POST | `/api/admin/audit-workflows/` | Audit workflows |
| GET/POST | `/api/admin/users/` | User management |
| GET/POST | `/api/admin/groups/` | Group/permission management |
| GET/POST | `/api/admin/backups/` | List/create backups |
| GET/PATCH | `/api/admin/backups/schedule/` | Scheduled backup settings |
| GET/PATCH | `/api/admin/backups/rclone/` | rclone remote configuration |

## Authentication

VaultBox uses **passkeys (WebAuthn)** as the primary sign-in method. Passkey login is always available.

**SSO (OAuth/OIDC)** is optional and admin-configurable under **Admin → SSO / OAuth** (`/admin/sso`). Add a provider (Google, Microsoft Entra ID, Okta, or generic OIDC), register the callback URL shown in the UI with your identity provider, and enable the provider. The login page then shows **Login with SSO** buttons alongside passkey sign-in.

Callback URL format: `{backend-base}/api/auth/oauth/{provider-id}/callback/` — set your public hostname under **Admin → Site & Hostname** (`/admin/site`). Leave hostname blank to default to the server hostname; `localhost` keeps dev ports (5173 / 8000).

## Backups

Admin **Backups** (`/admin/backups`) supports on-demand and scheduled SQLite + media archives.

- **Plain backups** — `.tar.gz` with `manifest.json`, `db.sqlite3`, and optional `media/`
- **Encrypted backups** — `.vaultbox` (AES-256-GCM + PBKDF2). The password is **not** stored; losing it means the backup cannot be restored.
- **Scheduled retention** — configure “keep N” in the UI; older completed backups are pruned automatically.
- **rclone upload** — optional off-site copy; `rclone` must be installed and on the server `PATH`. Configure remotes in the UI (same builder pattern as Apprise).

### Scheduled backups (cron)

Run the management command on your desired schedule (example: daily at 03:00 UTC):

```bash
cd backend
python3 manage.py run_scheduled_backups
```

Cron example:

```cron
0 3 * * * cd /path/to/VaultBox/backend && python3 manage.py run_scheduled_backups >> /var/log/vaultbox-backup.log 2>&1
```

Enable the schedule and set retention/encryption in **Admin → Backups → Scheduled backups**.

### Encryption keys

- **Backup file password** — chosen per backup or for scheduled encryption; required to decrypt `.vaultbox` files.
- **`VAULTBOX_ENCRYPTION_KEY`** — loaded from `.env` / the environment. Used to wrap scheduled backup passwords and holding secrets (Fernet). Keep `.env` backed up with the database; changing the key invalidates stored ciphertext.

### Restore

Restore from **Admin → Backups → Backup history**, or upload a `.tar.gz` / `.vaultbox` file under **Restore from upload** (for off-site or migrated backups). A pre-restore safety copy is created automatically. **Restart the VaultBox server** after restore so Django reloads the SQLite database.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, React Router

**Backend:** Django 5, Django REST Framework, Pillow, ReportLab, qrcode