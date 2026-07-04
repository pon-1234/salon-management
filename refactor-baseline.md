# Refactor Baseline

- Date: 2026-07-04 14:26:59 JST
- Scope: Phase 0 baseline for `refactor-instructions.md` and `ui-improvement-instructions.md`
- Note: `AGENTS.md`, `refactor-instructions.md`, and `ui-improvement-instructions.md` are untracked but were explicitly approved by the user as baseline exceptions.

## Git

```text
git status --short
?? AGENTS.md
?? refactor-baseline.md
?? refactor-instructions.md
?? ui-improvement-instructions.md
```

```text
git log --oneline -5
fa9e863 Document legacy gold admin migration inventory
ccd6bfc Fix CI lockfile and Next build prerender failures
96061e8 Fix Supabase env fallback for attachment prune job
6490f3b Unify store subpages with luxury theme
cdcc1a5 Redesign store home page to luxury theme
```

## Install

```text
pnpm install
[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY] Aborted removal of modules directory due to no TTY
```

```text
CI=true pnpm install
Dependencies were installed and Prisma Client was generated, then pnpm exited with:
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @prisma/client@6.11.1, @prisma/engines@6.11.1, esbuild@0.21.5, esbuild@0.25.9, prisma@6.11.1, sharp@0.34.5, unrs-resolver@1.11.0
```

`pnpm install` generated a `pnpm-workspace.yaml` file with build-script approval placeholders. Because this was a local tool artifact rather than a project change, it was removed after recording the install result.

## Commands

All script commands below used `pnpm --config.verify-deps-before-run=false ...` because the pnpm build-script approval state blocked normal script execution before reaching the actual command.

### typecheck

```text
pnpm --config.verify-deps-before-run=false typecheck 2>&1 | tail -30
FAIL
```

Representative errors:

- `app/api/chat/customers/route.test.ts`: mocked customer objects are missing phone verification fields.
- `components/cast-schedule/schedule-edit-dialog.tsx`: `format` is not imported.
- `components/mypage/profile-section.tsx`: `useState`, `Alert`, and `AlertDescription` are not imported; `birthMonth` does not exist on the profile type.
- `components/reservation/reservation-dialog.tsx`: `entryMeta.entryNotifiedAt` is possibly null.
- `lib/cast-portal/server.ts`: reservation query result type does not include the fields later accessed.
- `lib/pricing/usecases.ts` and `lib/pricing/usecases.test.ts`: `visibility` is missing from option payloads.

### lint

```text
pnpm --config.verify-deps-before-run=false lint 2>&1 | tail -30
FAIL
```

Representative errors:

- `app/cast/(portal)/diary/page.tsx`: `<a>` is used for internal navigation instead of `next/link`.
- `components/mypage/profile-section.tsx`: `Alert` and `AlertDescription` are not defined.

There are also existing React hooks warnings in multiple files.

### format:check

```text
pnpm --config.verify-deps-before-run=false format:check 2>&1 | tail -10
FAIL
```

Prettier reports style issues in 198 files.

### test

```text
pnpm --config.verify-deps-before-run=false test run 2>&1 | tail -20
FAIL
```

Summary:

```text
Test Files  25 failed | 79 passed (104)
Tests       111 failed | 687 passed | 7 skipped (805)
Snapshots   1 failed
```

Representative tail failure:

- `app/api/upload/route.test.ts`: expected Japanese upload error text, received `Upload failed`.

### build

```text
pnpm --config.verify-deps-before-run=false build 2>&1 | tail -20
PASS
```

The Next.js build completed successfully.

## Stop Condition

`refactor-instructions.md` section 5-6 applies: baseline `typecheck`, `lint`, and `test` fail before implementation, and `test` has 111 failing tests. This exceeds the "20件超" threshold. Per instruction, implementation must stop until the user chooses a direction for the existing baseline failures.
