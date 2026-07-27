# Non-functional foundations

This document records the application-owned security, performance, realtime, and quality gates
introduced for the phase 4 audit remediation.

## Browser security

`next.config.mjs` applies the following headers to every application response:

- Content Security Policy with explicit `default-src`, `script-src`, `style-src`, `img-src`,
  `font-src`, `connect-src`, `form-action`, `base-uri`, `frame-ancestors`, and `object-src`
- HSTS, `X-Frame-Options`, `X-Content-Type-Options`, Referrer Policy, and Permissions Policy

Production CSP does not permit `unsafe-eval`. The development server adds it because the Next.js
development runtime uses evaluated modules. Inline scripts and styles remain allowed for Next.js
hydration; moving to request nonces is the next CSP-hardening step.

The edge proxy's `X-Robots-Tag` remains an operational release control and is intentionally not
hardcoded here. Public launch requires changing both the application robots metadata and the proxy.

Middleware excludes immutable framework assets, optimized images, and static media. Route checks
use exact path-segment boundaries, and public storefront requests return before JWT decoding.

## Images

`SafeImage` uses `next/image`, supplies stable intrinsic dimensions, and retains the shared
`/images/non-photo.svg` error fallback. AVIF and WebP are enabled. HTTPS remote hosts are currently
permitted because image sources include migrated and provider-hosted assets; deployments should
narrow `remotePatterns` once the canonical production image hosts are finalized.

## Realtime updates

Authenticated pages share one `EventSource` connection through `RealtimeProvider`.
`/api/realtime` performs lightweight, role-scoped latest-row probes and emits a refresh event only
when a message or relevant reservation changes. Chat panels and the administrator notification
provider reload on that shared revision; their former independent timers have been removed.

The stream does not expose message IDs or content. Customer and cast probes are limited to their
own messages. Store-limited administrators only probe assigned-store reservations. PostgreSQL
`LISTEN/NOTIFY` can replace the five-second server probe later without changing the client
contract.

NextAuth focus refetch and interval polling are disabled. All `useSession` consumers share the
root `SessionProvider`.

## Automated quality gates

Vitest coverage thresholds are 55% for statements, lines, functions, and branches. Playwright
verifies:

- direct storefront navigation is intercepted by age verification and returns to its destination;
- the reservation journey renders its ordered steps;
- protected administrator navigation reaches the real login form with correct autocomplete
  attributes;
- application security headers are present in a browser response.

Run the browser suite locally after starting the Compose PostgreSQL service:

```bash
docker compose up -d postgres
pnpm exec prisma db push
pnpm exec playwright install chromium
pnpm test:e2e
```

CI provisions PostgreSQL, applies the Prisma schema, installs Chromium, and runs Playwright after
the production build.

## Reservation module boundaries

The largest reservation modules now delegate pure responsibilities:

- `quick-booking.utils.ts` owns time, designation, and option-catalog calculations.
- `reservation-dialog.shared.tsx` owns dialog state contracts and status presentation.
- `lib/reservation/route-utils.ts` owns API input normalization and audit formatting.

Unused domain barrel files and the unused cast-schedule data module were removed. The actively used
legacy-named schedule fallback was renamed to `fallback-data.ts` to make its opt-in purpose clear.
