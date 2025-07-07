#!/bin/bash
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

echo "🏗️  Building application..."
pnpm build

echo "✅ All CI checks passed!"