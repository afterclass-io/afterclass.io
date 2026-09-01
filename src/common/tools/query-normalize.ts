/**
 * Normalize a free-text search query before it reaches SQL, for both
 * course-code and professor-name matching.
 *
 * Single heuristic (deliberately simple, documented):
 * 1. Trim leading/trailing whitespace.
 * 2. Strip professor-name punctuation: commas/semicolons become a space so
 *    `"GOH, Jing Rong"` -> `"GOH Jing Rong"`.
 * 3. Collapse runs of whitespace to a single space.
 * 4. If the result looks like a course code (letters + optional space-separated
 *    letter prefix + digits, e.g. `ACCT 102`, `COR IS1702`), remove ALL
 *    interior whitespace so `"ACCT 102"` -> `"ACCT102"` and
 *    `"COR IS1702"` -> `"CORIS1702"`. Everything else (professor names,
 *    phrases) keeps single-space separation.
 *
 * Note: this collapses spaces in codes but does NOT re-insert dashes, so a
 * dashed canonical code like `COR-STAT1202` won't match the collapsed
 * `CORSTAT1202` via the code ILIKE branch; the trigram
 * `similarity(c.code, q)` and FTS branches still catch it.
 */
export function normalizeSearchQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "";

  // Comma/semicolon -> space (professor "GOH, Jing Rong").
  const stripped = trimmed.replace(/[,;]/g, " ");
  // Collapse whitespace runs to a single space.
  const collapsed = stripped.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";

  // Course-code shape: 2-4 letters, optional space + 0-4 letters, then 3-4
  // digits (e.g. ACCT 102, COR IS1702). Collapse the interior space so the
  // code ILIKE branch can match the stored code.
  const codeShape = /^[A-Za-z]{2,4} [A-Za-z]{0,4}\d{3,4}$/;
  return codeShape.test(collapsed) ? collapsed.replace(/ /g, "") : collapsed;
}
