import { object, type MCPServer } from "mcp-use/server";

/**
 * Minimal structural slice of the tRPC caller this resource needs.
 * Mirrors exactly what `list-acad-terms` (`caller.acadTerms.list()` in
 * `src/server/mcp/tools/read/catalog.ts`) returns: `AcadTermSummary[]`.
 */
export type AcadTermsCaller = {
  acadTerms: {
    list: () => Promise<Array<{ id: string; label: string; startDt: Date; endDt: Date }>>;
  };
};

/**
 * Build a caller for the public acad-terms catalog. No user session is needed:
 * `acadTerms.list` is a `publicProcedure` that only reads `ctx.db`. This mirrors
 * the caller construction in `src/server/mcp/caller.ts` (same `createCaller`
 * context shape) minus the user scoping - the resource handler has no auth
 * context, and academic terms are public data.
 *
 * Imported lazily (inside the handler) so that importing this module never pulls
 * the server stack: `src/mcp/prompts.test.ts` registers the resource against a
 * mocked `mcp-use/server` without invoking the handler, so it must not need DB /
 * tRPC modules at module scope.
 */
async function defaultCaller(): Promise<AcadTermsCaller> {
  const [{ db }, { createCaller }] = await Promise.all([
    import("@/server/db"),
    import("@/server/api/root"),
  ]);
  return createCaller(async () => ({
    db,
    session: null,
    headers: new Headers(),
  }));
}

/** Expose the academic terms catalog as a resource so clients can pre-load it. */
export function registerResources(server: MCPServer, caller?: AcadTermsCaller): void {
  server.resource(
    {
      name: "Academic terms",
      uri: "catalog://acad-terms",
      description: "The academic terms the course catalog is offered in (id = acadTermId used by search-courses and plan-semester).",
    },
    async () => {
      // Resolve live academic terms through the same tRPC caller as
      // `list-acad-terms`, so the resource and tool return the same shape.
      const acadTerms = caller ?? (await defaultCaller());
      const terms = await acadTerms.acadTerms.list();
      return object({ terms });
    },
  );
}
