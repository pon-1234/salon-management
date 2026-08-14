#!/bin/bash
# /**
#  * @design_doc   Production quality gate and build-time environment policy
#  * @related_to   lib/config/env.ts, deploy/xserver-vps/Dockerfile
#  * @known_issues Runtime dependency reachability must be verified after deployment
#  */
set -e

echo "🔍 Running CI checks..."

echo "📝 Checking formatting..."
pnpm format:check

echo "🔧 Running linter..."
pnpm lint

echo "🔍 Type checking..."
pnpm typecheck

echo "🧪 Running tests..."
pnpm test run

echo "📊 Checking test coverage..."
pnpm test:coverage

echo "🎭 Running browser journeys..."
pnpm test:e2e

echo "🏗️  Building application..."
env \
  DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
  NEXTAUTH_URL=https://build.invalid \
  NEXTAUTH_SECRET=build-time-placeholder-at-least-32-characters \
  STORAGE_ROOT=/tmp/salon-build-storage \
  STORAGE_PUBLIC_BASE_URL=https://build.invalid/salon-uploads \
  pnpm build

echo "✅ All CI checks passed!"
