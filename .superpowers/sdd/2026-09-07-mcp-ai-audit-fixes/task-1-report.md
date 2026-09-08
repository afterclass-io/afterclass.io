# Task 1 report: LLM_API_KEY optional + degraded mode

## Status: DONE

## What was implemented
- New `src/server/assistant/llm-status.ts`: `isLlmConfigured(e)` — never throws,
  warns once via `console.error` when the key is missing. Takes an explicit
  `LlmEnvLike` arg so tests never depend on ambient env; default is
  `process.env as LlmEnvLike` (cast required — weak-type TS2559 otherwise).
- `src/env.ts`: `LLM_API_KEY: z.string().min(1).optional()` — app boots and serves
  browsing without a key. `resolveLlmEnv()` in `providers.ts` unchanged (still the
  single fail-closed throw site at per-turn `getModel()`).
- `src/app/api/chat/route.ts`: 503 `"Assistant unavailable"` inserted after auth
  (line ~185), before body validation/quota/rate-limit — minimal 3-line diff as
  required for later Task 10/13 merges.
- `src/server/assistant/status.ts`: `AssistantStatus.aiDegraded: boolean` (required,
  mirrors brief) wired as `!isLlmConfigured(env)`.
- `assistant-provider.tsx` → `chat-panel.tsx`: `aiDegraded` threaded as a proper
  required `ChatPanelProps` prop (per ambiguity-resolution note, no cast). Banner
  above `MessageList`: `AI paused — browsing still works.` (exact brief copy).
- Storybook fallout fixed (required by tsc, not in brief file list but same one-line
  pattern): `chat-panel.stories.tsx` (all 7 stories + helper), `chat-page.stories.tsx`
  helper, `assistant-widget.stories.tsx` fixture — plus a new `Degraded` story.

## Files changed (commit 726e796)
- Created: `src/server/assistant/llm-status.ts`,
  `src/server/assistant/llm-status.test.ts` (brief-verbatim, log-test-first ordering),
  `src/server/assistant/providers-degraded.test.ts` (degraded-contract test).
- Modified: `src/env.ts`, `src/app/api/chat/route.ts`,
  `src/server/assistant/status.ts`, `src/modules/assistant/assistant-provider.tsx`,
  `src/modules/assistant/chat-panel.tsx` (brief files), plus test fixtures
  `src/server/assistant/status.test.ts` (`aiDegraded: false` + missing-key case),
  `src/app/api/chat/route.test.ts` (`llm-status` mock + 503 test), and 3 story files.
- `src/server/assistant/providers.test.ts` untouched (brief listed it in `git add`
  but required no changes — `resolveLlmEnv` behavior unchanged).
- Only `.superpowers/` remains untracked (plan workspace, not committed).

## TDD evidence
- RED: `bunx vitest run src/server/assistant/llm-status.test.ts` → 1 failed suite,
  `Error: Cannot find module './llm-status'` — expected, module did not exist yet.
- GREEN (helper): same command after creating `llm-status.ts` → 3 passed.
- GREEN (full per-task set):
  `bunx vitest run src/server/assistant/llm-status.test.ts
  src/server/assistant/providers.test.ts src/server/assistant/providers-degraded.test.ts
  src/server/assistant/status.test.ts src/app/api/chat/route.test.ts`
  → **5 files, 49 tests, all passed** (incl. new 503 test asserting
  `reserveMessage`/`checkAndIncrement`/`streamText` NOT called, and
  `aiDegraded: true` status case).
- Degraded-boot proof: same subset with `$env:LLM_API_KEY=''` → 12/12 passed
  (env validation no longer throws on empty key).
- `bunx tsc --noEmit` → clean (fixed 8 story errors + 1 TS2559 with local cast).
- `bunx eslint` on touched files → 3 errors, all pre-existing patterns confirmed
  on the clean tree via `git stash` (2 in `route.test.ts`) or repo-wide baseline
  (`() => {}` spy impls in `dispatch.test.ts`, `audit-log.test.ts`); CI
  (`tests-unit.yml`) gates on vitest only, so the brief-verbatim snippet was kept.

## Self-review findings
- Completeness: all 6 brief steps done; exact 503 body/status, banner copy, and
  commit message used verbatim.
- Minimal scope: route edit is 2 imports + 3-line gate; no behavior change to
  quota/rate-limit/canned/scope paths (503 sits after auth, before body parsing,
  so malformed bodies in degraded mode also 503 — intended: no state touched).
- No overbuilding: `providers-degraded.test.ts` only pins the degraded contract
  (gate-false + throw-site), no refactor of `resolveLlmEnv`.
- Deviation from brief (justified): log-ordering note added to `llm-status.test.ts`
  (warn-once flag makes the spy test order-dependent); `process.env as LlmEnvLike`
  cast added (tsc TS2559); story files updated (tsc-required).

## Issues / concerns
- None blocking. Note for later tasks: `status.test.ts` and `route.test.ts` now mock
  `./llm-status` / `@/server/assistant/llm-status` — Task 10/13 edits to `route.ts`
  must keep that import path stable or update the mock in lockstep.

## Fix report (review round, 2026-09-08)
- What changed: `src/server/assistant/llm-status.test.ts:10` —
  `mockImplementation(() => {})` → `mockImplementation(() => undefined)`.
  One-line, lint-clean; assertion unchanged (still expects `console.error`
  called with a string containing `LLM_API_KEY`). Deferred minors untouched:
  `route.ts:183` stale comment kept, module-level `warned` flag kept.
- Covering tests:
  `bunx vitest run src/server/assistant/llm-status.test.ts
  src/server/assistant/providers.test.ts src/server/assistant/providers-degraded.test.ts
  src/server/assistant/status.test.ts src/app/api/chat/route.test.ts`
  → **5 files, 49 tests, all passed** (1.18s).
- Lint: `bunx eslint src/server/assistant/llm-status.test.ts` → exit 0, no output
  (clean). `bun run lint` (= `next lint`) fails identically on the clean tree
  (verified via `git stash`: crashes in `src/env.ts` env validation during
  `next.config.js` load — pre-existing environmental issue, unrelated to this fix).
