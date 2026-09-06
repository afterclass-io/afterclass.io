/**
 * Single output policy for the MCP layer: bearer-token stripping, pagination
 * caps, truncation, and page-link helpers.
 *
 * CANONICAL strip helper (Task 7 reuses this — do NOT build a second one):
 * `stripSecrets` from `@/mcp/output-policy`. Bearer tokens (`shareToken`,
 * `icalToken`) and private `notes` must never reach model-visible text.
 *
 * No behavior change is wired here: helpers are pure and opt-in per call
 * site. Call sites: dispatch text shape (`src/mcp/dispatch.ts`), catalog
 * tools (`my-bids` clamps via `capPage`), `page-links.ts` link builders.
 */

/**
 * ~6k tokens at the chars/4 heuristic. Parity with `MAX_TOOL_RESULT_CHARS`
 * in `src/server/assistant/tools.ts` (kept as a literal here on purpose:
 * `tools.ts` imports `dispatch.ts`, so importing the constant from there
 * would cycle `tools.ts → dispatch.ts → output-policy.ts → tools.ts`).
 */
export const DEFAULT_MAX_OUTPUT_CHARS = 24_000;

export const DEFAULT_TRUNCATION_NOTE =
  "\n[truncated - result too large; refine your query or request fewer items]";

/** Pagination defaults matching the `my-bids` schema (limit default 20, max 50). */
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;
export const DEFAULT_PAGE_OFFSET = 0;

/** Case-sensitive exact keys stripped from model-visible output. */
const SECRET_KEYS: ReadonlySet<string> = new Set([
  "shareToken",
  "icalToken",
  "notes",
]);

function deepStripSecrets(value: unknown): {
  value: unknown;
  stripped: boolean;
} {
  if (Array.isArray(value)) {
    let stripped = false;
    const out = value.map((v) => {
      const r = deepStripSecrets(v);
      stripped ||= r.stripped;
      return r.value;
    });
    return { value: out, stripped };
  }
  if (value !== null && typeof value === "object") {
    let stripped = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.has(k)) {
        stripped = true;
        continue;
      }
      const r = deepStripSecrets(v);
      stripped ||= r.stripped;
      out[k] = r.value;
    }
    return { value: out, stripped };
  }
  return { value, stripped: false };
}

function redactValuePattern(
  text: string,
  key: "shareToken" | "icalToken",
): string {
  // `"shareToken": "s"` / `"icalToken": "i"` — the value is always a string
  // for these two keys.
  return text.replace(
    new RegExp(`"${key}"\\s*:\\s*"[^"]*"`, "g"),
    `"${key}":"[redacted]"`,
  );
}

function redactNotesPattern(text: string): string {
  // `"notes": ...` — the value may be a string, object, array, or scalar, so
  // redact the whole value: balanced-bracket scan from the first opener.
  let out = "";
  let i = 0;
  const re = /"notes"\s*:\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const valueStart = m.index + m[0].length;
    const first = text[valueStart];
    let end: number;
    if (first === '"' || first === "{" || first === "[") {
      end = scanJsonValueEnd(text, valueStart);
    } else {
      const term = text.slice(valueStart).search(/[,}\]]/);
      end = term === -1 ? text.length : valueStart + term;
    }
    out += text.slice(i, m.index) + `"notes":"[redacted]"`;
    i = end;
    re.lastIndex = end;
  }
  return out + text.slice(i);
}

/** Index one past the end of the JSON value starting at `start`. Never throws. */
function scanJsonValueEnd(text: string, start: number): number {
  const first = text[start];
  if (first === '"') {
    let j = start + 1;
    while (j < text.length) {
      const c = text[j];
      if (c === "\\") {
        j += 2;
        continue;
      }
      if (c === '"') return j + 1;
      j += 1;
    }
    return text.length;
  }
  const open = first;
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (close === null) return text.length;
  let depth = 0;
  let inString = false;
  let j = start;
  while (j < text.length) {
    const c = text[j];
    if (inString) {
      if (c === "\\") {
        j += 2;
        continue;
      }
      if (c === '"') inString = false;
      j += 1;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) return j + 1;
    }
    j += 1;
  }
  return text.length;
}

/**
 * Strip bearer tokens + private notes from SERIALIZED JSON text.
 *
 * JSON-aware pass: `JSON.parse` the payload, deep-strip the three exact
 * case-sensitive keys (`shareToken`, `icalToken`, `notes`) at every nesting
 * level, re-stringify. On parse failure, fall back to regex redaction of the
 * `"shareToken": "..."` / `"icalToken": "..."` / `"notes": ...` patterns
 * (notes values may be strings/objects — the whole value is redacted).
 *
 * Never throws on any input. Returns the input unchanged only when nothing
 * matches and it isn't parseable JSON.
 */
export function stripSecrets(text: string): string {
  try {
    const parsed: unknown = JSON.parse(text);
    const { value, stripped } = deepStripSecrets(parsed);
    // Avoid re-stringifying clean payloads (byte-stable for tests asserting
    // exact strings); only re-serialize when a key was actually removed.
    if (!stripped) return text;
    return JSON.stringify(value);
  } catch {
    let out = redactValuePattern(text, "shareToken");
    out = redactValuePattern(out, "icalToken");
    out = redactNotesPattern(out);
    return out;
  }
}

/**
 * Strip secrets from a parsed value (arrays/objects/scalars) without a
 * JSON round-trip. Returns the value with the three exact case-sensitive
 * keys (`shareToken`, `icalToken`, `notes`) removed at every nesting level.
 * Used by catalog tools that build their own `jsonText` envelopes
 * (visibility tools); the serialized-text `stripSecrets` remains the
 * canonical helper for Task 7 reuse.
 */
export function stripSecretsFromValue<T>(value: T): T {
  return deepStripSecrets(value).value as T;
}

export interface CapPageInput {
  limit?: unknown;
  offset?: unknown;
}

/**
 * Clamp pagination input to sane bounds (limit default 20, max 50 — matching
 * the `my-bids` schema; offset default 0, never negative). Non-numeric input
 * falls back to defaults; fractional input is floored.
 */
export function capPage<T extends CapPageInput>(
  input: T,
): T & { limit: number; offset: number } {
  const rawLimit =
    typeof input.limit === "number" ? Math.floor(input.limit) : NaN;
  const rawOffset =
    typeof input.offset === "number" ? Math.floor(input.offset) : NaN;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_PAGE_LIMIT)
    : DEFAULT_PAGE_LIMIT;
  const offset = Number.isFinite(rawOffset)
    ? Math.max(rawOffset, DEFAULT_PAGE_OFFSET)
    : DEFAULT_PAGE_OFFSET;
  return { ...input, limit, offset };
}

/**
 * Append page deep-links to model-visible text. One link per line; nullish or
 * empty links are skipped; when no links survive, the text is returned
 * unchanged. (Call sites add links only where outputs already carry them
 * today — see the search-courses adapter which builds its own `Search page:`
 * / per-hit lines inline from `@/server/mcp/tools/page-links`; no invented
 * link-appends. Import the `*Page` builders from there, not from here.)
 */
export function appendLinks(
  text: string,
  links: Array<string | null | undefined>,
): string {
  const kept = links.filter(
    (l): l is string => typeof l === "string" && l.length > 0,
  );
  if (kept.length === 0) return text;
  return `${text}\n${kept.join("\n")}`;
}

/**
 * Truncate model-visible text to `maxChars` (default
 * `DEFAULT_MAX_OUTPUT_CHARS`). No-op when under the limit; over the limit the
 * text is sliced and `note` (default `DEFAULT_TRUNCATION_NOTE`) is appended.
 */
export function truncate(
  text: string,
  maxChars: number = DEFAULT_MAX_OUTPUT_CHARS,
  note: string = DEFAULT_TRUNCATION_NOTE,
): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + note;
}
