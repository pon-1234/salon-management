# Salon Management VPS Deployment

`salon-management` is the target production runtime for the XServer VPS managed
by the `platinum-management` repository. Legacy data cutover remains **No-Go**;
this topology and passing CI do not mean that production traffic has moved.
Vercel and hosted Supabase are not part of the target runtime.

## Runtime topology

- `salon-system`: standalone Next.js application with NextAuth
- `salon-postgres`: isolated PostgreSQL database and credentials
- `salon-cron`: idle scheduler container; no production job is currently approved
- `salon-storage-data`: persistent local image volume served read-only by Caddy
- `salon-backup`: encrypted database and image backup loop

The existing Platinum Supabase-compatible services are not used by Salon. Only
the Caddy reverse proxy, private Docker network, backup passphrase, and server
resources are shared.

`salon.c-platinum.com` is a test domain. The root metadata emits
`noindex, nofollow`, and `/robots.txt` disallows all crawlers. Do not remove
these controls until a production domain and indexing launch are approved.

## Required production configuration

Configure the `SALON_*` variables documented in
`platinum-management/deploy/xserver-vps/.env.example`. Set DNS for the chosen
`SALON_DOMAIN` to the VPS public IP before deployment. Secrets must remain in the
VPS `.env` file and must not be committed.

The application fails closed in production unless `DATABASE_URL` is a PostgreSQL
URL, `NEXTAUTH_URL` and `STORAGE_PUBLIC_BASE_URL` are absolute HTTPS URLs, and
`STORAGE_ROOT` is a non-root absolute path. `NEXTAUTH_SECRET` is mandatory and
must contain at least 32 characters.
The storage root must be the writable application side of the persistent volume;
Caddy mounts the same content read-only. The Docker builder uses non-secret
`.invalid` and local-path placeholders only while compiling. Those values are not
copied into the runtime stage and are never production credentials.

Email-based account recovery and SMS verification require all of the following
application variables in production: `RESEND_API_KEY`, `FROM_EMAIL`,
`VONAGE_API_KEY`, `VONAGE_API_SECRET`, and `VONAGE_SMS_FROM`. Values must be
non-empty, and `FROM_EMAIL` must belong to a verified sender domain.
`NOTIFICATION_MOCK_ENABLED` must remain `false`; notification mocks are accepted
only outside production and only when explicitly enabled.

When `LINE_MESSAGING_ENABLED=true` (or a LINE access token implicitly enables
messaging), both `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` and
`LINE_CHANNEL_SECRET` must be non-empty or readiness fails.

## Deployment

Clone this repository to `/opt/salon-management`. From `/opt/platinum`, validate
and deploy the combined Compose stack:

```bash
docker compose --env-file deploy/xserver-vps/.env -f deploy/xserver-vps/compose.yml config
ENV_FILE=deploy/xserver-vps/.env deploy/xserver-vps/scripts/deploy.sh
```

The external Compose file is not stored in this repository, so its effective
configuration is an independent release input. Inspect the resolved Compose
output before every deployment and confirm that no healthcheck override replaces
`/api/health` with `/` or another shallow endpoint. A Compose healthcheck that
does not call `/api/health` is a release blocker even when the image-level check
is correct.

The referenced Platinum deployment repository now configures the isolated
`salon-preview-system` check with `/api/health`. Re-verify the resolved Compose
output on every release because this repository does not modify that external
configuration, and any override back to `/` remains a release blocker.

The application entrypoint runs `prisma migrate deploy` before accepting traffic.
The image health check calls `/api/health` and stays unhealthy unless every
required check passes: database `SELECT 1`, a storage write-and-delete probe,
email/SMS configuration, and LINE credentials when LINE is enabled. Verify a
`200` readiness response, the application, an authenticated image upload, and
provider delivery in staging after deployment. The readiness response contains
status values only; it never returns credentials, error details, or absolute
storage paths. Runtime provider failures are emitted as redacted structured logs.
Deployment of the hashed bearer-token policy intentionally invalidates any
password-reset links, email-verification links, or phone-verification codes
issued by an older release. Ask affected users to request a new link or code
after cutover.

## Initial administrator bootstrap

The production image includes the explicit `pnpm setup:admin` operation, but it is
not run automatically by either application startup or database migration. Run it
manually only after migrations have completed. The command has no default
credentials and validates all inputs before creating a database client.

For a global administrator, provide the secret through the shell environment so
it is not included in shell history or the process command line:

```bash
export ADMIN_BOOTSTRAP_EMAIL='owner@example.com'
export ADMIN_BOOTSTRAP_NAME='Production Owner'
read -r -s ADMIN_BOOTSTRAP_PASSWORD && export ADMIN_BOOTSTRAP_PASSWORD
export ADMIN_BOOTSTRAP_ROLE='super_admin'
export ADMIN_BOOTSTRAP_PERMISSIONS='*'
export ADMIN_BOOTSTRAP_STORE_IDS=''
export ADMIN_BOOTSTRAP_ALLOW_EXISTING_UPDATE=false

docker compose --env-file deploy/xserver-vps/.env -f deploy/xserver-vps/compose.yml \
  exec -e ADMIN_BOOTSTRAP_EMAIL -e ADMIN_BOOTSTRAP_NAME \
  -e ADMIN_BOOTSTRAP_PASSWORD -e ADMIN_BOOTSTRAP_ROLE \
  -e ADMIN_BOOTSTRAP_STORE_IDS -e ADMIN_BOOTSTRAP_PERMISSIONS \
  -e ADMIN_BOOTSTRAP_ALLOW_EXISTING_UPDATE \
  salon-system pnpm setup:admin

unset ADMIN_BOOTSTRAP_PASSWORD
```

`super_admin` always receives exactly `*` and no store assignment. To create a
store-limited manager, use a distinct manager identity and run the same command
with these explicit values:

```bash
export ADMIN_BOOTSTRAP_EMAIL='manager@example.com'
export ADMIN_BOOTSTRAP_NAME='Store Manager'
export ADMIN_BOOTSTRAP_ROLE='manager'
export ADMIN_BOOTSTRAP_STORE_IDS='existing-store-id-1,existing-store-id-2'
export ADMIN_BOOTSTRAP_PERMISSIONS='reservation:*,customer:read,cast:read,analytics:read,dashboard:view'
```

Manager permissions must be members of the bootstrap allowlist: `cast:read`,
`cast:create`, `cast:update`, `cast:delete`, `cast:*`; `customer:read`,
`customer:create`, `customer:update`; `reservation:read`, `reservation:create`,
`reservation:update`, `reservation:delete`, `reservation:*`; the equivalent
`pricing` read/create/update/delete or wildcard permissions; `settings:read`,
`settings:update`, `settings:*`; `analytics:read`; and `dashboard:view`. Every
store ID must identify an active store. Passwords must be at least 16 characters
and at most 72 UTF-8 bytes. The command never prints the password.

Re-running the exact configuration is idempotent and performs no write. If an
administrator with that email exists but its name, password, role, permissions,
active state, or store assignments differ, the command fails closed. Inspect the
existing account first; only for an intentional full reconciliation, set
`ADMIN_BOOTSTRAP_ALLOW_EXISTING_UPDATE=true` (equivalent to the
`--allow-existing-update` flag) and rerun. That acknowledgement can change or
downgrade privileges and replaces all store assignments in one transaction, so
unset it immediately afterwards.

## Point expiration safety gate

Point expiration is fail-closed. The VPS cron container has no point job, the
GitHub Actions workflow has no trigger, both point-expiration APIs return `503`,
and the administration screen exposes no execution action. FIFOロット配賦・
旧データ移行・顧客残高との照合について本番責任者が承認するまで、
手動・自動とも無効のまま維持してください。環境変数やcron設定だけで有効化
できる隠しスイッチはありません。

Enabling expiration requires a separate, reviewed change that completes all of
the following first:

1. Record the remaining balance of every earned-point lot and allocate every use,
   adjustment, and expiration to lots in FIFO order.
2. Convert the legacy point history into those lots using a repeatable migration,
   including an explicit policy for incomplete or contradictory history.
3. Reconcile each customer's calculated lot balance with `Customer.points`,
   investigate every difference, and obtain written production-owner approval.
4. Rehearse expiration and rollback against a production-like snapshot, then
   prove database backup restoration before scheduling any mutation.

The expiring-point email API is also disabled because unallocated earned rows can
overstate the amount that remains available. There is no scheduled point email
job in `salon-cron`; ordinary reservation, account, SMS, and LINE notifications
are separate request-driven paths and are not changed by this safety gate. Do not
schedule expiration emails until the same FIFO migration and reconciliation have
been approved.

## Chat attachment retention

Automatic attachment deletion is disabled on both GitHub Actions and the VPS
cron container until the production database, storage volume, backups, and
restore procedure have been verified. The GitHub Actions workflow can only be
started manually. It requires a retention period between 30 and 36,500 days and
the exact acknowledgement
`I_UNDERSTAND_THIS_MODIFIES_PRODUCTION_DATA`; the script exits before creating a
database client when either value is missing or invalid.

Do not add the pruning command back to `cron-entrypoint.sh` until production
owners explicitly approve automatic deletion. Before enabling a schedule,
confirm the storage adapter points at `salon-storage-data`, run the manual
workflow against staging, verify that files and database metadata agree, and
record a successful backup restore. Even after approval, the script must retain
`CHAT_ATTACHMENT_PRUNE_ACKNOWLEDGEMENT` and
`CHAT_ATTACHMENT_RETENTION_DAYS` in the scheduled environment.

## Optional migration from an earlier Salon deployment

This optional path applies only if this `salon-management` application previously
ran on Vercel and Supabase. It is not the `gambit-front` legacy migration; follow
the separate legacy migration runbook for that source and keep it untouched until
the approved cutover procedure.

Export the current PostgreSQL database and restore it into `salon-postgres` before
DNS cutover. Copy existing Supabase Storage objects into the `images` directory
of `salon-storage-data`, preserving their stored relative paths. Keep the old
services read-only through an explicitly approved rollback-retention window.
Remove the Vercel project and hosted Supabase project only after database row
counts, login, uploads, images, cron jobs, and restorable backups have been
verified and the production owner has closed that rollback window.
