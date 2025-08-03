# Task Completion Checklist

## Automated Checks (via Code Hooks)

When you complete a task, the following checks run automatically:

### On File Edit (PostToolUse Hook)

- **Test files**: Run related tests with `pnpm vitest run --related`
- **Code files**: Auto-format with Prettier and ESLint

### On Task Completion (Stop Hook)

1. **Linting**: `pnpm lint`
2. **Type checking**: `pnpm typecheck`
3. **Tests**: `pnpm vitest run`
4. **Coverage**: `pnpm vitest run --coverage`
5. **Coverage threshold check**: Currently 5% (will increase to 100%)

## Manual Requirements

After automated checks pass:

1. Review `DOC_CHECKLIST.md` if generated
2. Update relevant documentation (README.md, DEVELOPMENT_GUIDE.md)
3. Ensure all tests are green
4. Verify no @ts-ignore or skipped tests

## CI Script

Run `./scripts/ci.sh` for complete validation:

- Format check
- Lint
- Type check
- Tests
- Coverage
- Build

## Important

- NEVER commit unless explicitly asked
- Follow TDD: Red → Green → Refactor
- Document with JSDoc for major components
