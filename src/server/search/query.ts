import { MIN_QUERY_LEN } from "@/common/constants/search";
import { normalizeSearchQuery } from "@/common/tools/query-normalize";

const MAX_TSQUERY_TOKENS = 8;

export function prepareQuery(raw: string) {
  const q = normalizeSearchQuery(raw);
  const tsQuery = buildTsQuery(q);
  return {
    q,
    tsQuery,
    hasQuery: q.length >= MIN_QUERY_LEN && tsQuery !== null,
  };
}

/** Returns a to_tsquery string such as "cor:* & stat1202:*", or null if no token remains. */
export function buildTsQuery(q: string): string | null {
  const tokens = q
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, MAX_TSQUERY_TOKENS);
  return tokens.length === 0 ? null : tokens.map((t) => `${t}:*`).join(" & ");
}

/** Dash- and space-insensitive course code key. */
export function toCodeKey(q: string): string {
  return q.toUpperCase().replace(/[\s\-\u2010-\u2015\u2212]+/g, "");
}

/** Escapes LIKE metacharacters. PostgreSQL's default LIKE escape is backslash. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
}
