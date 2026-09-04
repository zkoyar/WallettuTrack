# Production checklist

A release can be approved only after every item has been verified.

## Code and supply chain

- [ ] The worktree is clean, the commit has been reviewed, and it has a signed tag.
- [ ] `npm run release:check` completes without errors.
- [ ] CI is green for the commit or tag.
- [ ] The image was built from the tag and is identified by an immutable digest.
- [ ] `SOURCE_CODE_URL` points to the source corresponding to the AGPL version.

## Public configuration

- [ ] `DEPLOYMENT_VISIBILITY=public`.
- [ ] `AUTH_URL` uses HTTPS and matches the public domain.
- [ ] `AUTH_SECRET` is random and at least 32 characters long.
- [ ] The MySQL passwords are distinct, random, and at least 24 characters long.
- [ ] `REGISTRATION_MODE` is `first-user` or `closed`.
- [ ] If registration is intentionally open, `ALLOW_PUBLIC_REGISTRATION=true` is
      also set after an anti-abuse assessment.
- [ ] The controller name, privacy contact, and retention period contain real data.

## Network and operations

- [ ] The database is not exposed to the Internet.
- [ ] The reverse proxy overrides `X-Real-IP`, `X-Forwarded-For`, and
      `X-Forwarded-Proto` and enforces request-body limits;
      `deploy/Caddyfile.example` is provided as a reference.
- [ ] `/api/health` returns 200 externally and the TLS certificate is valid.
- [ ] Recovery after a MySQL restart has been tested.
- [ ] Each installation has unique `COMPOSE_PROJECT_NAME` and
      `MYSQL_VOLUME_NAME` values; no two running MySQL containers share a volume.
- [ ] Logs, uptime, and disk space are monitored and have alerts.

## Data

- [ ] `scripts/backup-db.ps1` or `scripts/backup-db.sh` is scheduled daily.
- [ ] Backups are encrypted or stored in separate encrypted storage.
- [ ] A recent restore test has been completed.
- [ ] Backup retention and access comply with the privacy notice.

## Upgrading an older MySQL volume

Oracle's MySQL 8.4.12 image uses different data-directory ownership from the
older Docker Hub `mysql:*` image. Do not change permissions on the historical
volume and do not mount it directly in the Oracle container. Migrate through a
verified logical backup instead:

1. Create a backup with `scripts/backup-db.ps1` or `scripts/backup-db.sh` and
   verify that its `.sha256` sidecar is present.
2. Stop the old stack and retain its volume unchanged as a rollback copy.
3. Set a new, unused `MYSQL_VOLUME_NAME` in `.env`, create that exact external
   volume, and build the `app` and `migrate` images.
4. Start only MySQL with `docker compose up -d --no-deps mysql` and wait until
   it is healthy.
5. Restore the verified SQL backup. The restore script recreates the database,
   applies every pending Prisma migration, starts the app, and waits for health.
6. Compare record counts, test login and backup creation, then retain the old
   volume for a documented rollback period before deliberately removing it.

## Rotating credentials on an existing volume

Changing only `MYSQL_ROOT_PASSWORD` or `MYSQL_APP_PASSWORD` in `.env` does not
update users already stored in the MySQL volume and will break database access.
On Windows, use the guarded rotation command after creating a verified backup:

```powershell
.\scripts\rotate-secrets.ps1 `
  -BackupFile .\backups\wallettutrack-YYYYMMDD-HHMMSSmmm.sql.gz `
  -Confirm ROTATE
docker compose up -d --build --force-recreate
```

The script verifies the backup checksum, tests the old credential, updates all
matching MySQL accounts, verifies both new credentials, and atomically replaces
`.env`. It never prints generated secrets. For a manual rotation on another
platform:

1. Create and verify a backup.
2. Generate three distinct random values: the root password, application
   password, and `AUTH_SECRET`.
3. Open the MySQL client with the current root credential:
   `docker compose exec mysql mysql -uroot -p`.
4. Check hosts with `SELECT User, Host FROM mysql.user;`, then run
   `ALTER USER 'wallettutrack_app'@'%' IDENTIFIED BY 'NEW_APP_PASSWORD';` and
   an equivalent `ALTER USER` for every listed `root` account.
5. Immediately update `.env` with the same values and recreate the stack with
   `docker compose up -d --force-recreate`.
6. Verify `/api/health`, login, and backups. Rotating `AUTH_SECRET`
   intentionally invalidates every existing session.

Use only URL-safe characters for the application password, or encode it
correctly in any `DATABASE_URL` used outside Compose.
