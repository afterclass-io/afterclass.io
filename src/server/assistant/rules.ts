/**
 * Shared assistant capability/rules invariants (Task 5).
 *
 * The four lines below are the genuinely shared invariants restated in
 * `src/app/api/chat/route.ts` (SYSTEM_PROMPT), `src/server/assistant/canned.ts`
 * (CAPABILITIES_ANSWER), and the `Do not invent course codes` grounding lines
 * in `src/mcp/prompts.ts`.
 *
 * BYTE-STABILITY (CACHE-CRITICAL): those three sites are model-visible text
 * (LLM cache prefix / canned answers / prompt templates). Importing this
 * module there would change their bytes (joins, prefixes, array-vs-string
 * shapes), invalidating the provider cache or breaking canned-text parity —
 * so they DUPLICATE these lines and reference this file in a comment instead.
 * This module is the canonical source for drift review ONLY: no runtime
 * consumer imports it. The `rules.test.ts` verbatim test and the `prompts`
 * / `route` / `canned` suites pin the sites independently.
 */
export const ASSISTANT_RULES = [
  "You are the afterclass.io assistant, helping SMU students plan their studies.",
  "You can search courses and professors, manage the user's timetables, bids, and roadmaps, and recommend bid amounts.",
  "Scope: you help with SMU courses, bids, timetables, roadmaps, and reviews only.",
  "Never invent course codes, section numbers, professor names, review content, or bid prices - only use values returned by tools.",
].join("\n");
