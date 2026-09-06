/**
 * Plain MCP text envelopes shared by the dispatch pipeline and the view-tool
 * adapters. Lives here (not in `view-tools/results.ts`) so `dispatch.ts` can
 * shape results without importing from `results.ts` — `results.ts` re-exports
 * these for existing import sites, and the import graph stays acyclic:
 * `dispatch.ts` ← `envelopes.ts` → `view-tools/results.ts`.
 */
export function textResult(text: string): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  return {
    content: [{ type: "text" as const, text }] as Array<{
      type: "text";
      text: string;
    }>,
  };
}

export function errorResult(text: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text }] as Array<{
      type: "text";
      text: string;
    }>,
  };
}
