# AI Collaboration Policy: Claude & Gemini with Hooks

This file contains your core operating instructions. Adhere to these rules strictly.
The philosophical background is detailed in `DEVELOPMENT_GUIDE.md`, but these instructions are your primary source of truth for action.

## Guiding Principle
**"Gemini collects, Claude crafts, TDD steers, and Hooks guarantees."**
You are the brain, Gemini is your researcher, and Code Hooks are the automated quality gates. Your entire workflow is driven by Test-Driven Development (TDD).

---

### Ⅰ. Core Directives (Your Primary Rules)

#### 0. TDD First (Wada's Three Rules)
This is your primary development cycle. Follow these three rules religiously:
1.  **Red** – Write a minimal failing test first.
2.  **Green** – Write the simplest code to make the test pass.
3.  **Refactor** – Eliminate duplication and improve design, keeping all tests green.

> ⚠️ **Hooks will run your tests automatically.** You are **forbidden** to write implementation code before you have a failing test (Red).

#### 1. Documentation First
For every major class or module you create or edit, you **MUST** add a JSDoc-style comment block at the top. If you don't have the information, ask me.

```javascript
/**
 * @design_doc   (URL to the design document)
 * @related_to   (Related class names with a brief note on their purpose)
 * @known_issues (URL to a ticket summarizing known bugs or limitations)
 */
```

#### 2. Absolute Prohibitions (You Must Never Do These)
- **DO NOT** relax conditions (e.g., weakening TypeScript types, changing `===` to `==`) just to fix a test or type error.
- **DO NOT** skip tests (`describe.skip`, `it.skip`) or use improper mocks to bypass failures.
- **DO NOT** hardcode outputs or responses that should be dynamic.
- **DO NOT** ignore or suppress error messages (e.g., using `// @ts-ignore` or empty `catch` blocks).
- **DO NOT** implement temporary fixes or leave `TODO` comments for core issues. Address the root cause.
- **DO NOT ignore test coverage blindly.** If a piece of code is genuinely untestable, you **MUST** add a `/** @no-test-required reason: [Your justification here] */` annotation above it.

---

### Ⅱ. Workflow and Quality Gates

#### 1. TDD Cycle & Automated Checks (Managed by Hooks)
Your workflow is monitored by Code Hooks.
- **On Test File Edit:** Your test will be run with `--related` to confirm it fails (Red phase).
- **On Code File Edit:** Prettier and ESLint will run automatically to ensure code quality.
- **On Task Completion (`Stop` Hook):** The following checks are mandatory and will run automatically. You cannot complete the task until they all pass.
    1.  **CI Script (`./scripts/ci.sh`):** Runs lint, prettier, typecheck, test, build, and playwright tests.
    2.  **Test Coverage:** Must be 100%. Exceptions are managed via `vitest.config.ts` and `@no-test-required` annotations.

#### 2. Post-TDD Tasks (Finalization)
- **Update Documentation:** After all `Stop` Hooks pass, a `DOC_CHECKLIST.md` file may be generated. **You MUST review this file and update all relevant documentation (e.g., `README.md`) accordingly.** This is your final responsibility.

---

### Ⅲ. Gemini Delegation Policy

- **Red/Green Phases:** **Do not use Gemini.** Focus on the fast TDD cycle.
- **Refactor Phase:** Use `gemini-search` or `gemini-analyze` for complex refactoring, researching new APIs, or as a final review.
- **Summarize, Don't Paste:** Summarize Gemini's findings. Do not paste its raw output.

---

### Ⅳ. Project Architecture Overview

This is a Next.js salon management application built with React 19, TypeScript, and Tailwind CSS. The codebase follows a clean architecture pattern with clear separation of concerns.

#### Core Domains
- **Cast Management (`lib/cast/`)**: Manages cast/staff members with appointment scheduling.
- **Customer Management (`lib/customer/`)**: Customer profiles, usage records, and member types.
- **Reservations (`lib/reservation/`)**: Booking system with service management.
- **Analytics (`lib/analytics/`)**: Sales reports, performance tracking, and business metrics.
- **Chat (`lib/chat/`)**: Customer communication system.

#### Data Layer
Each domain follows a repository pattern: `types.ts`, `repository.ts`, `repository-impl.ts`, `usecases.ts`, `data.ts`.

#### UI Components
Components are in `components/`. Domain-specific components (e.g., `cast/`, `reservation/`), and shared UI components in `ui/` (shadcn/ui based).

#### Page Structure
App Router pages in `app/`. Feature-based routing (e.g., `/cast/`, `/customers/`, `/analytics/`).

#### Key Technologies
- **UI Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with shadcn/ui
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Date Handling**: date-fns
