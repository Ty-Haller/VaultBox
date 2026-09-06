# Security

VaultBox is a **local-first** inventory app. Treat the machine that runs it as the trust boundary.

## Secrets

- **`.env`** (repo root) holds `SECRET_KEY` and `VAULTBOX_ENCRYPTION_KEY`. Django creates it on first start (mode `0600`). Never commit it.
- Changing `VAULTBOX_ENCRYPTION_KEY` makes existing Fernet ciphertext undecryptable (holding secrets, seed phrases, wrapped backup-schedule passwords). Back up `.env` with the database.
- Backup archive passwords are chosen per backup and are **not** stored. Losing the password means that `.vaultbox` file cannot be restored.

## Auth

- Sign-in is passkeys (WebAuthn). RP ID is `localhost` unless `VAULTBOX_HOSTNAME` or **Admin → Site & Hostname** sets another name. Open the App URL that matches that RP ID (`http://localhost:5173` for local beta, not `127.0.0.1`). Changing RP ID requires re-registering passkeys.
- There is no password login.
- Demo inventory reset is Full Admin only (**Admin → Danger zone**, type `RESET`).

## Reporting

This repository is private. If you find a vulnerability, tell the operator directly — do not file a public issue with exploit details.
