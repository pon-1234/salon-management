# Development Workflow

## TDD Cycle (Mandatory)

1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve design with all tests green

## AI Collaboration

- **Claude**: Main implementation, TDD cycle
- **Gemini**: Research, analysis, code review (via `/task gemini-search` or `/task gemini-analyze`)
- **Code Hooks**: Automated quality gates

## Workflow Steps

1. Understand task requirements
2. Write failing test (Red phase)
3. Implement minimal solution (Green phase)
4. Refactor if needed
5. Run CI checks: `./scripts/ci.sh`
6. Update documentation

## Git Workflow

- Current branch: main
- Clean status at start
- Recent commits show feature/bugfix pattern
- DO NOT commit unless explicitly asked

## Environment

- Platform: Darwin (macOS)
- Working directory: /Users/pon/dev/salon-management
- Git repo: Yes
- Node/pnpm for package management

## Key Reminders

- Always use TodoWrite for task planning
- Follow CLAUDE.md instructions strictly
- Use Serena tools for code exploration
- Prefer editing over creating new files
