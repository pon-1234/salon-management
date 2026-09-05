# /**
#  * @design_doc   docs/VPS_DEPLOYMENT.md
#  * @related_to   entrypoint.sh - Applies database migrations; platinum-management compose.yml - Runs this image
#  * @known_issues docs/VPS_DEPLOYMENT.md
#  */
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXTAUTH_SECRET=build-time-placeholder-at-least-32-characters
ENV NEXTAUTH_URL=https://build.invalid
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV STORAGE_ROOT=/tmp/salon-build-storage
ENV STORAGE_PUBLIC_BASE_URL=https://build.invalid/salon-uploads
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates cron curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib/admin ./lib/admin
COPY --from=builder /app/lib/migration ./lib/migration
COPY --from=builder /app/lib/preview-uat ./lib/preview-uat
COPY --from=builder /app/lib/settlement ./lib/settlement
COPY --from=builder /app/lib/settings ./lib/settings
COPY --from=builder /app/scripts/setup-admin.ts ./scripts/setup-admin.ts
COPY --from=builder /app/scripts/setup-preview-uat.ts ./scripts/setup-preview-uat.ts
COPY --from=builder /app/scripts/import-gold-master-ikebukuro-preview.ts ./scripts/import-gold-master-ikebukuro-preview.ts
COPY --from=builder /app/scripts/import-gold-master-ikebukuro-ledger.ts ./scripts/import-gold-master-ikebukuro-ledger.ts
COPY --from=builder /app/scripts/import-gold-master-ikebukuro-profiles.ts ./scripts/import-gold-master-ikebukuro-profiles.ts
COPY --from=builder /app/scripts/verify-gold-master-ikebukuro-preview.ts ./scripts/verify-gold-master-ikebukuro-preview.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
COPY deploy/xserver-vps/entrypoint.sh /usr/local/bin/salon-entrypoint
COPY deploy/xserver-vps/cron-entrypoint.sh /usr/local/bin/salon-cron-entrypoint
RUN chmod 755 /usr/local/bin/salon-entrypoint /usr/local/bin/salon-cron-entrypoint
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail --silent --show-error http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/usr/local/bin/salon-entrypoint"]
CMD ["node", "server.js"]
