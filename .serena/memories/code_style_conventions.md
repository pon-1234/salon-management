# Code Style and Conventions

## General Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with:
  - No semicolons
  - Single quotes
  - 2 space indentation
  - Trailing comma ES5
  - 100 character print width
  - Tailwind CSS plugin for class sorting
- **Linting**: ESLint with Next.js core-web-vitals config
- **Imports**: Use absolute imports with `@/` prefix

## Development Philosophy (from CLAUDE.md)

- **TDD First**: Follow Red-Green-Refactor cycle
- **Documentation**: Add JSDoc comments for major classes/modules with:
  - @design_doc
  - @related_to
  - @known_issues
- **Prohibitions**:
  - NO relaxing conditions (type weakening, === to ==)
  - NO skipping tests or improper mocks
  - NO hardcoding dynamic outputs
  - NO ignoring errors or using @ts-ignore
  - NO temporary fixes or TODOs for core issues

## Architecture Patterns

- Clean architecture with domain separation
- Repository pattern for data access
- Use cases for business logic
- Functional React components with hooks
- Type-safe forms with React Hook Form + Zod

## Testing

- Write failing test first (TDD)
- Use Vitest for unit tests
- Test coverage thresholds: 30% (targeting 100%)
- Use `@no-test-required reason: [justification]` for untestable code
