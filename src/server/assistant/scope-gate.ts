/**
 * Cheap pre-LLM scope gate for `/api/chat` (Task 7).
 *
 * `isInScope(text)` is a substring/keyword allowlist over the last user
 * message. The route calls it BEFORE `reserveMessage`, so off-topic turns
 * (e.g. "reverse a linked list") get a static refusal with no LLM call and
 * no quota consumed. It is a coarse pre-filter only — the SYSTEM_PROMPT's
 * scope rule remains the authoritative behavioral guard, so anything the
 * gate lets through (greetings, follow-ups, "help me ...") is still refused
 * or redirected by the model when genuinely off-topic.
 *
 * Fail-open: empty/unextractable text returns true (never break a turn we
 * cannot judge). Fail-closed only on text that clearly matches nothing.
 */

/**
 * Long domain keywords matched as substrings of the lowercased text. Every
 * entry was checked against the negative verbatim case ("reverse a linked
 * list please") and against common off-topic vocabulary (code, homework,
 * essay, python, weather, ...). NOTE: "list" is deliberately ABSENT — it
 * appears in "linked list" and would flip the negative case.
 */
const SUBSTRING_KEYWORDS: readonly string[] = [
  "timetable",
  "course",
  "professor",
  "review",
  "roadmap",
  "bidding",
  "semester",
  "module",
  "section",
  "budget",
  "studies",
  "schedule",
  "recommend",
  "matric",
  "syllabus",
  "prereq",
  "enrol",
  "credit",
  "exam",
  "plan",
  "school",
  "acad",
  "window",
  "faculty",
  "faculties",
  "lecture",
  "tutorial",
  "seminar",
  "venue",
  "smu",
  "gpa",
  "secure",
  "success",
];

/**
 * Short/generic words matched as EXACT tokens (never substrings: "ok" is in
 * "smoke", "hi" is in "which", "yes" is in "eyes"). Covers domain nouns that
 * collide as substrings ("bid" in "forbid", "term" in "determine", "class"
 * in "classic", "prof" in "profile") plus conversational continuations
 * (greetings, acks, follow-up suggestion prompts like "explain that" /
 * "concrete example" / "what next") that carry no domain noun but are
 * legitimate turns. Deliberately absent: "list", "please", "help", "how",
 * "what", "why" — all appear in natural off-topic phrasings.
 */
const WORD_KEYWORDS: ReadonlySet<string> = new Set([
  "bid",
  "bids",
  "class",
  "classes",
  "prof",
  "profs",
  "term",
  "terms",
  "study",
  "grade",
  "grades",
  "explain",
  "example",
  "examples",
  "detail",
  "details",
  "next",
  "continue",
  "elaborate",
  "thanks",
  "thank",
  "yes",
  "yeah",
  "yep",
  "okay",
  "ok",
  "hello",
  "hey",
  "hi",
]);

/**
 * Follow-up fragments with no domain noun ("him", "that", "more detail")
 * that continue an in-scope turn. Only consulted against the PREVIOUS user
 * message — never alone — so "tell me more" after an off-topic turn still
 * refuses.
 */
const FOLLOWUP_TOKENS: ReadonlySet<string> = new Set([
  "him",
  "her",
  "them",
  "it",
  "that",
  "those",
  "more",
  "detail",
  "details",
  "specifically",
  "else",
]);

function tokensOf(lower: string): string[] {
  return lower.split(/[^a-z0-9]+/).filter((t) => t.length > 0);
}

/**
 * Course-code mentions (e.g. IS215, COR-IS1702, ACCT102, LAW 205, ACCT104/112):
 * a bare "Have I already taken IS215?" carries no domain noun but is
 * unambiguously an afterclass question. Same shape as the prereq-code
 * extractor in `src/server/mcp/tools/feasibility-check.ts` — case-insensitive
 * here because scope-gate runs on raw user text.
 */
const COURSE_CODE_PATTERN =
  /\b[a-z]{2,4}(?:-[a-z]{2,4})?\s?\d{3,4}(?:\/\d{3,4})?\b/i;

function matchesKeywords(lower: string): boolean {
  if (COURSE_CODE_PATTERN.test(lower)) return true;
  for (const k of SUBSTRING_KEYWORDS) {
    if (lower.includes(k)) return true;
  }
  for (const t of tokensOf(lower)) {
    if (WORD_KEYWORDS.has(t)) return true;
  }
  return false;
}

export function isInScope(text: string, prevText?: string): boolean {
  const lower = text.toLowerCase();
  if (lower.trim().length === 0) return true; // fail-open: nothing to judge
  if (matchesKeywords(lower)) return true;
  const prev = prevText?.toLowerCase() ?? "";
  if (prev.trim().length === 0) return false;
  if (!matchesKeywords(prev)) return false;
  return tokensOf(lower).some((t) => FOLLOWUP_TOKENS.has(t));
}

/** Static cheap-refusal body served with no LLM call and no quota consumed. */
export const SCOPE_REFUSAL =
  "I'm the afterclass.io assistant for SMU students — I can't help with that here. " +
  "Try asking about courses, timetables, bids, roadmaps, or reviews instead.";
