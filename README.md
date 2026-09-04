# WallettuTrack

**Self-hosted personal finance tracker.** Your accounts, transactions, budgets,
and forecasts live in a MySQL database that you run and control — no cloud
account, no third-party analytics, no telemetry.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-149eca.svg)](https://react.dev)
[![MySQL 8.4](https://img.shields.io/badge/MySQL-8.4-00618a.svg)](https://www.mysql.com)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://docs.docker.com/compose/)
[![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8.svg)](#progressive-web-app)

The entire production environment is three Docker Compose services:

| Service   | Role                                                                |
| --------- | ------------------------------------------------------------------- |
| `app`     | Next.js 16 in standalone mode, internal port 3001                   |
| `mysql`   | MySQL 8.4.12 with persistent storage on an external volume          |
| `migrate` | Prisma 7 job that applies migrations before the application starts  |

By default the app is published only on `127.0.0.1`, registration closes after
the first account is created, and the only outbound network request is the
optional exchange-rate refresh.

## Features

**Money in and out**

- Multiple accounts, each with its own currency and balance source
- Transactions, transfers between accounts, tags, and categories
- Category rules that classify new transactions automatically
- Account reconciliation against real statement balances

**Planning**

- Budgets per category and savings goals
- Recurrence rules with idempotent generation, so a recurring entry is never
  duplicated
- Planned events and a calendar view
- Cash-flow forecasts built on a baseline scenario

**Insight**

- Dashboard, statistics, and a printable report
- Automatic detection of recurring subscriptions
- Multi-currency support with stored exchange rates; bundled static rates keep
  totals correct while offline

**Data ownership**

- Revolut CSV import with SHA-256 fingerprint deduplication, both against the
  database and within the file itself
- CSV and JSON export, plus JSON backup import
- Scripted database backup and restore with mandatory checksum verification

**Interface**

- English, Italian, German, and French
- Light and dark themes
- Installable as a Progressive Web App with an offline screen

## Quick start

Requirements: Docker Desktop or Docker Engine with the Compose plugin.

```bash
git clone <repository-url>
cd WallettuTrack
cp .env.example .env
```

Configure at least `AUTH_SECRET`, `MYSQL_ROOT_PASSWORD`, and
`MYSQL_APP_PASSWORD`. Use distinct random values: at least 32 characters for
`AUTH_SECRET` and at least 24 URL-safe characters for each MySQL password. For
local use, keep `AUTH_URL=http://localhost:3001`.

Create the protected volume once, then start the stack:

```bash
docker volume create wallettutrack-mysql-data
docker compose up -d --build
```

Open <http://localhost:3001> and create the administrator account. With the
default configuration, registration closes automatically afterwards.

On Windows you can run `start-server.bat` instead, which creates the volume when
needed. `stop-server.bat` stops the stack without deleting data.

Check status and logs with:

```bash
docker compose ps
docker compose logs -f app
```

### ARM64 hosts

The default `MYSQL_IMAGE` is pinned to the MySQL 8.4.12 image for `amd64`. On an
ARM64 host, set this immutable alternative in `.env` before the first start:

```dotenv
MYSQL_IMAGE=container-registry.oracle.com/mysql/community-server:8.4.12-aarch64@sha256:b47aed6d0a79fbb71d55ca0d0a928bf6f9427b17310635e8c4945814559c2b06
```

### Running more than one installation

Every independent installation must use its own `COMPOSE_PROJECT_NAME` and
`MYSQL_VOLUME_NAME` in `.env`. Never start two MySQL containers against the same
volume. Container and network names are derived from the Compose project, so
separately named installations cannot collide.

## Configuration

All settings live in `.env`; [`.env.example`](.env.example) documents every key.

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Session signing secret, 32+ random characters |
| `AUTH_URL` | Public base URL; must be HTTPS once reachable from the Internet |
| `MYSQL_ROOT_PASSWORD`, `MYSQL_APP_PASSWORD` | Distinct random database credentials, 24+ characters each |
| `DATABASE_URL` | Prisma connection string; Compose rewrites the host automatically |
| `COMPOSE_PROJECT_NAME`, `MYSQL_VOLUME_NAME` | Isolation identifiers, unique per installation |
| `MYSQL_BIND_ADDRESS`, `MYSQL_PORT`, `APP_PORT` | Published addresses; keep the database on `127.0.0.1` |
| `DEPLOYMENT_VISIBILITY` | `private` or `public`; `public` enforces the full production checklist |
| `REGISTRATION_MODE`, `ALLOW_PUBLIC_REGISTRATION` | Registration policy; open sign-up requires both to be set deliberately |
| `PRIVACY_CONTROLLER_NAME`, `PRIVACY_CONTACT_EMAIL`, `PRIVACY_RETENTION_DAYS` | Details shown in the privacy notice of a public deployment |
| `SOURCE_CODE_URL` | Location of the corresponding source, required by the AGPL |
| `EXCHANGE_RATE_API_BASE` | Exchange-rate provider; the app works offline without it |
| `BACKUP_RETENTION_DAYS` | Retention applied by the backup scripts |

Credentials already stored in a MySQL volume are not updated by editing `.env`.
Use `scripts/rotate-secrets.ps1` or the manual procedure in the
[production checklist](docs/PRODUCTION_CHECKLIST.md#rotating-credentials-on-an-existing-volume).

## Security model

- Passwords are hashed with bcrypt. Values that exceed bcrypt's 72-byte input
  limit are rejected rather than silently truncated, and a minimum of 12
  characters is enforced.
- Login is rate-limited to 5 attempts per 15 minutes, persisted in the database
  so restarting the app does not reset the counter, with a 16 KB body cap.
- Sessions carry a version that invalidates them when the password changes.
- Responses set `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  HSTS, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, a
  restrictive `Permissions-Policy`, and `Cache-Control: no-store` on every API
  route. The `X-Powered-By` header is disabled.
- Containers run as an unprivileged user; CI asserts this on every build.
- `/api/health` returns `503` when a public deployment is misconfigured.

Found a vulnerability? Please report it privately to the maintainer rather than
opening a public issue.

## Optional remote access

By default the application port is published only on `127.0.0.1`. To reach it
from other devices, put it behind a VPN or an authenticated HTTPS reverse proxy
pointing at `http://127.0.0.1:3001`, then set `AUTH_URL` in `.env` to the chosen
HTTPS URL. Tailscale Serve is one option, but nothing of the sort is required
for local use.

## Publishing on the Internet

Before exposing the app, set `DEPLOYMENT_VISIBILITY=public`, use an HTTPS
`AUTH_URL`, and fill in the privacy details and `SOURCE_CODE_URL` in `.env`.
Registration stays limited to the first user; opening it intentionally requires
both `REGISTRATION_MODE=open` and `ALLOW_PUBLIC_REGISTRATION=true`.

The reverse proxy must terminate TLS, overwrite client forwarding headers, and
send traffic to `127.0.0.1:3001`. Adapt
[`deploy/Caddyfile.example`](deploy/Caddyfile.example) as needed, and complete
the [production checklist](docs/PRODUCTION_CHECKLIST.md) before launch.

## Backup and restore

Create a consistent compressed backup:

```powershell
.\scripts\backup-db.ps1
```

Verify and restore one, with an automatic safety backup:

```powershell
.\scripts\restore-db.ps1 -BackupFile .\backups\wallettutrack-YYYYMMDD-HHMMSS.sql.gz -Confirm RESTORE
```

Linux and macOS users can run the equivalent `.sh` scripts. Backups are excluded
from Git, and the matching `.sha256` sidecar is mandatory during restore. The
restore stops the app, makes a safety backup, recreates the database so no stale
tables survive, applies migrations, and starts the app only after a successful
health check. If any destructive-stage step fails, the app stays stopped.

Copy backups and their checksum files to encrypted external storage, and test
restores regularly.

## Migrations and updates

`docker compose up -d --build` rebuilds the application. The `migrate` service
runs `prisma migrate deploy` once MySQL is healthy; the app starts only after
migrations succeed.

MySQL 8.4.12 comes from the Oracle Container Registry, whose data-directory
ownership differs from the older `mysql:*` images on Docker Hub. When upgrading
an existing Docker Hub installation, **do not** attach the old volume to the
Oracle image. Create and verify a SQL backup, choose a new `MYSQL_VOLUME_NAME`,
initialize that empty volume, and restore the backup — keeping the old volume
until the result is verified. The step-by-step procedure is in the
[production checklist](docs/PRODUCTION_CHECKLIST.md#upgrading-an-older-mysql-volume).

## Portable packages

Build self-contained archives with prebuilt Docker images for both supported
architectures:

```powershell
npm run package:portable
```

This produces `WallettuTrack-Portable-<version>-amd64.zip` for Intel/AMD
machines and `WallettuTrack-Portable-<version>-arm64.zip` for Apple Silicon and
ARM64 systems. Packaging requires a clean Git worktree so the bundled source
archive matches the images exactly.

Each archive ships guided startup for Windows, macOS, and Linux, automatic
architecture checks, SHA-256 checksums, the AGPL license, the corresponding
source, an SPDX runtime SBOM, image metadata, and BuildKit provenance records.
MySQL is included, so installation and first start need no Internet connection.
Portable packages contain no account or personal data. Existing artifacts are
never overwritten — increment the version in `package.json` before publishing a
new release.

## Progressive Web App

WallettuTrack installs as a PWA with its own manifest, icons, and a dedicated
offline screen. The service worker is served with `no-store` and its own
`default-src 'self'` content security policy.

## Interface languages

The complete interface is available in English, Italian, German, and French. On
a first visit WallettuTrack follows the browser's preferred supported language.
The language menu in the header, on the authentication screens, and in the
footer stores the choice for later visits and for the signed-in profile. Dates,
currency values, notifications, printable reports, install metadata, and the
offline screen all follow the selection.

## Development

Requirements: Node.js 22.23.0 (the version CI uses) and a reachable MySQL
instance. Use Turbopack on the host for interactive development:

```bash
npm install
npm run dev
```

The Prisma client is regenerated automatically before development, builds, and
type checks. The host `DATABASE_URL` uses `localhost:3306`; Compose replaces the
hostname with the `mysql` service automatically.

### Quality checks

```bash
npm run check           # eslint + tsc --noEmit + vitest
npm run build           # production build
npm run security:audit  # npm audit, high severity and above
npm run release:check   # all of the above, in order
node scripts/qa.mjs     # end-to-end suite against a running instance
```

The end-to-end suite creates and removes an ephemeral QA user automatically.

CI runs the same checks on every push and pull request, then builds the
production images, boots the full stack, waits for `/api/health`, runs the
end-to-end suite, verifies recovery after a MySQL restart, and exercises a
destructive backup-and-restore cycle.

Remove caches, logs, and generated code without touching databases or backups:

```bash
npm run clean
```

If the app is used only through Docker, `npm run clean:all` also removes
`node_modules`; run `npm ci` later to restore it.

### Tech stack

Next.js 16 (App Router, standalone output) · React 19 · TypeScript · Tailwind
CSS 4 · Radix UI · Recharts · Auth.js v5 · Prisma 7 with the MariaDB driver
adapter · Zod · Vitest · Docker Compose

## Contributing

Issues and pull requests are welcome. Before opening a pull request, run
`npm run check` and make sure CI is green. Keep the worktree clean — the
portable packaging script refuses to run otherwise.

## License

WallettuTrack is distributed under the GNU Affero General Public License,
version 3.0 (`AGPL-3.0-only`). Anyone who distributes the program, or makes a
modified version available over a network, must provide the corresponding
complete source code as required by the license. See [LICENSE](LICENSE) for the
full text.
