# Contributing

Thanks for looking at VaultBox. It is local-first hard asset inventory — you run it; it is not a public internet service.

## Before you start

- Read [README.md](README.md) for install (Docker/Podman or Python + Node).
- Open the UI at **http://localhost:5173** in development, or the container App URL. Passkeys fail on `127.0.0.1`.
- Do not commit `.env`, SQLite files, or `backend/media/`.

## Pull requests

1. Fork and branch from `main`.
2. Keep the change scoped. Match existing naming and layout.
3. If you touch the UI, say how you verified it (browser at localhost, desktop and a narrow viewport when layout changed).
4. Contributions are under the [Apache License 2.0](LICENSE).

## Issues

- Bug reports and feature ideas are welcome.
- **Do not** file a public issue with exploit details. See [SECURITY.md](SECURITY.md).

## Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
