# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Baseline** is a player-first live tennis app (web + iOS): live scores across ATP/WTA/Challenger/ITF, favourite players, and time-zone-aware notifications. The full product and technical plan lives in `tennis-app-plan.md` — read it before making architectural decisions; it is the source of truth for scope, design direction, and data flow.

**Stack (decided):**

- Web: **Vite + React + TypeScript**, TanStack Router + TanStack Query, Tailwind, shadcn/ui primitives under the "Club" design tokens (plan §4)
- iOS: Expo / React Native sharing packages with web (later phase)
- Database/Auth: **Supabase** (project ref `pzlvsljladbymdgtxger`) with row-level security; schema in plan §6 lands via Supabase CLI migrations in `supabase/migrations/`
- Data source: RapidAPI "Tennis API — ATP/WTA/ITF", accessed **only** by our ingestion service — never from clients (plan §5/§8: poll once, fan out)

## Development Commands

```bash
npm install        # install dependencies
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # production build
npm run preview    # preview production build
npm run lint       # ESLint
npx tsc --noEmit   # type check
```

(Keep this section updated as the workspace is scaffolded.)

## Working principles (12-rule template)

These rules apply to every task in this project unless explicitly overridden.

**Bias:** caution over speed on non-trivial work.

### Rule 1 — Think before coding

State assumptions explicitly. Ask rather than guess.

Push back when a simpler approach exists. Stop when confused.

### Rule 2 — Simplicity first

Minimum code that solves the problem. Nothing speculative.

No abstractions for single-use code.

### Rule 3 — Surgical changes

Touch only what you must. Don't improve adjacent code.

Match existing style. Don't refactor what isn't broken.

### Rule 4 — Goal-driven execution

Define success criteria. Loop until verified.

Strong success criteria let Claude loop independently.

### Rule 5 — Use the model only for judgment calls

Use for: classification, drafting, summarization, extraction.

Do **not** use for: routing, retries, deterministic transforms.

If code can answer, code answers.

### Rule 6 — Token budgets are not advisory

Per-task: 4,000 tokens. Per-session: 30,000 tokens.

If approaching budget, summarize and start fresh.

Surface the breach. Do not silently overrun.

### Rule 7 — Surface conflicts, don't average them

If two patterns contradict, pick one (more recent / more tested).

Explain why. Flag the other for cleanup.

### Rule 8 — Read before you write

Before adding code, read exports, immediate callers, shared utilities.

If unsure why existing code is structured a certain way, ask.

### Rule 9 — Tests verify intent, not just behaviour

Tests must encode **why** behaviour matters, not just **what** it does.

A test that can't fail when business logic changes is wrong.

### Rule 10 — Checkpoint after every significant step

Summarize what was done, what's verified, what's left.

Don't continue from a state you can't describe back.

### Rule 11 — Match the codebase's conventions, even if you disagree

Conformance > taste inside the codebase.

If you think a convention is harmful, surface it. Don't fork silently.

### Rule 12 — Fail loud

"Completed" is wrong if anything was skipped silently.

"Tests pass" is wrong if any were skipped.

Default to surfacing uncertainty, not hiding it.

## TypeScript Standards

**Type Safety:**

- **Eliminate `any` types** — use proper typing or generics; `any` is an ESLint error
- **Add explicit return types** to all functions
- **Use discriminated unions** over loose object types (e.g. match status: `scheduled | live | suspended | finished` as a tagged union, not optional flags)
- **Leverage utility types** (Pick, Omit, Partial, Required, etc.)
- **NEVER use type/lint suppression comments** (`@ts-expect-error`, `@ts-ignore`, `eslint-disable`, `@ts-nocheck`) — fix the underlying issue: create proper type definitions, use type guards and narrowing, refactor to be type-safe
- Type error handling with guards: `if (error instanceof Error) { ... }`

**Type Management:**

- **Check for existing types before creating new ones** — search `@/types` for duplicates or near-duplicates first
- **Reuse, don't redefine** — import from `@/types`
- **Centralise types used in 2+ files** into `@/types/[category]/`
- API-shape types (Tennis API payloads, Supabase rows) live in one place; the rest of the codebase consumes our domain types, never raw API shapes

**Component / hook typing:**

```typescript
export interface ScorePlaqueProps { ... }
export function ScorePlaque({ ... }: ScorePlaqueProps) { ... }

export interface UseLiveMatchReturn { ... }
export function useLiveMatch(fixtureId: number): UseLiveMatchReturn { ... }
```

## Linting Posture

Mirror the landiq_labs ESLint configuration when scaffolding `eslint.config.js`:

**Error-level:** `@typescript-eslint/no-explicit-any` · `no-unused-vars` (prefix `_` to ignore) · `no-redeclare` · `no-restricted-imports` banning relative imports (`../`) — use `@/` aliases

**Warning-level:** explicit function return types · no `!` non-null assertions (use type guards) · `??` over `||` for nullish checks · `?.` optional chaining · `no-console` (use the project logger)

**Relaxations:** test files may use `!`, `||`, and skip return types; scripts and `vite.config.ts` may use `console` and relative imports.

```typescript
// ✅ const value = input ?? defaultValue;   // nullish only
// ❌ const value = input || defaultValue;   // also swallows 0, '', false
```

## Domain Constants — never hardcode data keys

The landiq_labs equivalent of this rule (FEATURE_PROP constants) translates here as:

- **Tennis API field access** goes through typed mappers in `@/services/tennisData` — components never read raw API payload keys (`countryAcr`, `timeGame`, `indicator`) directly. One mapping layer, one place to fix when the provider changes (plan §13: `TennisDataPort`).
- **Design values** come from the Club token system (`@/styles/tokens` → CSS custom properties). Never hardcode hex colours, font names, or spacing (`color: '#0E3B27'` ❌ → `var(--centre-court)` ✅). The palette and type scale are defined in plan §4.2 and nowhere else.
- **Analytics events** (PostHog) use centralised constants from `@/constants/analyticsEvents` — never inline event-name strings. Naming convention: `area.feature.action` (e.g. `favourites.player.added`, `alerts.set_score.enabled`). Include `duration_ms` for timed operations and `error_message` for failures.

## Logging & Error Handling

- Use `logger` from `@/lib/logger` — never `console.*` in `src/`
- `logger.info/warn/error/debug(message, context, componentName)`
- User-facing errors follow the Club copy voice (plan §4.3): specific and directive, never "Something went wrong" — e.g. "Play suspended — scores last updated 40 seconds ago."
- Errors: log via `logger.error()` + display via UI error states; success/info may toast
- Proper async/await handling and error boundaries; guard async state updates after unmount

## Memory Management

**Every `useEffect` with side effects must clean up:**

- Event listeners → `removeEventListener`
- Timers → `clearTimeout` / `clearInterval`
- Subscriptions (Supabase realtime channels, WebSocket connections) → `.unsubscribe()` / close on unmount — this codebase is subscription-heavy (live scores), so leaks compound fast
- Guard async state updates to avoid setting state after unmount

## Security Requirements

**Never:**

- Hardcode API keys, secrets, or credentials
- Put the **RapidAPI key or Supabase `service_role` key anywhere client-reachable** — RapidAPI is called only by the ingestion service; clients get only the Supabase anon key (RLS enforced)
- Use `dangerouslySetInnerHTML` (if unavoidable, sanitise and document)
- Make ad-hoc `fetch()` calls — use centralised service helpers

**Always:**

- Load client-side config from `import.meta.env.VITE_*`; server secrets from server env only
- Enable row-level security on every table containing user data (`users`, `favourites`, `devices`, `notifications`)
- Validate and sanitise search text and user inputs

## Code Style & British English

**All code must use British English spelling** — variable/function names, comments, UI text: `organise`, `favourite`, `colour`, `behaviour`, `centralise`.

**Exceptions (do not rename):**

- Web platform/CSS/library APIs: `color`, `center` in CSS-in-JS, `behavior` in scroll options, etc.
- Tennis API response fields as received (`countryAcr`, etc.) — but these stay inside the mapping layer anyway

Note: `favourites` is both the UK spelling and the domain term — the table, routes, and types all use `favourites`, never `favorites`.

## Forbidden Patterns

**Do NOT:**

- Use `console.*` (use `logger`)
- Use type/lint suppression comments
- Add TODO, FIXME, HACK, XXX comments
- Leave commented-out code blocks
- Write tutorial-style comments ("First, we fetch…")
- Use generic names (`handleClick`, `processData`, `helperFunction`) — use domain names (`handleFavouriteToggle`, `organiseOrderOfPlay`, `formatLocalKickoff`)
- Hardcode design values, API field names, or analytics event strings
- Duplicate logic that exists in `@/utils`, `@/services`, `@/constants`
- Create files >500 lines or functions >30 lines (split)
- Create duplicate types — check `@/types` first
- Use PropTypes (TypeScript handles this)

## Time-Zone Handling (project-critical)

This product's core promise is correct local times. Non-negotiables:

- Store **UTC everywhere** (DB, state, transport); convert at the presentation edge only
- Users carry an **IANA time zone** (`Australia/Sydney`), never a fixed offset — DST-safe
- Use a single shared time utility (`@/utils/time`) for all conversion/formatting; no inline `new Date()` arithmetic or ad-hoc `toLocaleString` calls scattered through components
- Provisional match times are rendered with `~` and never presented as precise (plan §7)
- Write tests for DST boundaries and date-line cases — these are the bugs that break user trust

## File & Function Size

- Target **<30 lines per function**, **≤500 lines per file**
- Split into smaller components, hooks under `@/hooks/`, utilities under `@/utils/[category]/`, types under `@/types/[category]/`
- `index.ts` files are barrel exports only; if one accrues logic, rename it descriptively

## Performance Patterns

- Code splitting: dynamic imports for heavy libraries
- Virtual scrolling for long lists (rankings, full live list)
- Debounce search inputs
- TanStack Query for caching/dedup of reads; Supabase realtime or WebSocket for live pushes — never poll from the client
- Avoid premature optimisation, but fix obvious inefficiencies

## Code Review Standards

Before review: check the file isn't unused (delete instead); search for existing types/utilities before accepting new ones; check for similar reviewed files as reference.

Fundamentals: Single Responsibility · DRY (centralise duplicates into `@/utils`/`@/services`) · KISS · intent-revealing, British-English, domain-specific naming.

After review verification:

- `npx tsc --noEmit` clean · ESLint clean
- No suppression comments anywhere
- No duplicate types; shared types centralised; existing types reused
- All `useEffect` side effects have cleanup
- Behaviour matches the original intent; imports updated in dependents

## Continuous Learning & Knowledge Capture

**This document should evolve as we work together.** When important patterns, gotchas, or insights specific to this codebase are discovered, capture them here.

**Process:**

1. **Always confirm first** — propose the addition and where it fits
2. **Wait for explicit approval** before editing this file
3. **Keep it actionable** — specific, practical guidance, not general programming advice

**Worth capturing:** Tennis API quirks (rate limits, payload inconsistencies between tours, live-feed edge cases like retirements/walkovers), Supabase RLS gotchas, notification-delivery edge cases, Club design-system decisions made during build.
