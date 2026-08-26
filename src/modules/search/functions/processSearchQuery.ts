export function processSearchQuery(query: string): string {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  return terms.join(" & ");
}
