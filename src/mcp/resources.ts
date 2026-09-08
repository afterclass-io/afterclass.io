import type { MCPServer } from "mcp-use";
import { db } from "@/server/db";
import { createCaller } from "@/server/api/root";
import type { ToolContext } from "@/server/mcp/types";
import { buildToolContext } from "./user";

export type AcadTermsCaller = {
  acadTerms: {
    list: () => Promise<
      Array<{ id: string; label: string; startDt: Date; endDt: Date }>
    >;
    current?: () => Promise<{ id: string } | null>;
  };
};

async function defaultCaller(): Promise<AcadTermsCaller> {
  return createCaller(async () => ({
    db,
    session: null,
    headers: new Headers(),
  }));
}

/**
 * Resolve the caller for the resource handler: explicit injection wins
 * (tests), otherwise thread identity via `buildToolContext` (same ctx shape
 * dispatch takes) and use the user-scoped caller. Returns undefined when
 * there is no usable identity — the handler then falls back to the anonymous
 * `defaultCaller()` (public procedures only, documented at the call site).
 */
async function resolveResourceCaller(
  caller: AcadTermsCaller | undefined,
  ctx: unknown,
): Promise<AcadTermsCaller | undefined> {
  if (caller) return caller;
  if (ctx === undefined) return undefined;
  // Structural guard (Task 12): only accept the dispatch-shaped ctx (an
  // object carrying a caller with acadTerms.list). Anything else falls back
  // to the anonymous caller below instead of throwing deep in tRPC.
  const maybeCaller = (ctx as { caller?: unknown }).caller as
    | { acadTerms?: { list?: unknown } }
    | undefined;
  if (typeof maybeCaller?.acadTerms?.list !== "function") {
    const toolCtx: ToolContext | undefined = await buildToolContext(
      ctx as never,
    );
    if (!toolCtx) return undefined;
    const scoped: unknown = toolCtx.caller;
    if (
      typeof (scoped as { acadTerms?: { list?: unknown } }).acadTerms?.list !==
      "function"
    )
      return undefined;
    return scoped as AcadTermsCaller;
  }
  return { acadTerms: maybeCaller.acadTerms } as AcadTermsCaller;
}

export function registerResources(
  server: MCPServer,
  caller?: AcadTermsCaller,
): void {
  server.resource(
    {
      name: "Academic terms",
      uri: "catalog://acad-terms",
      description:
        "The academic terms the course catalog is offered in (id = acadTermId used by search-courses and plan-semester).",
      mimeType: "application/json",
    },
    async (uri, reqCtx) => {
      // Identity, threaded like dispatch's `buildToolContext` path: accept
      // the same ctx shape dispatch takes and resolve it to a user-scoped
      // caller. `catalog://acad-terms` backs only public procedures
      // (`acadTerms.list` / `acadTerms.current` are publicProcedure — no
      // per-user data), so and ONLY so, an unresolved identity falls back to
      // an anonymous caller instead of failing closed. Non-public resources
      // must NOT reuse this fallback — require identity there.
      const resolved = await resolveResourceCaller(caller, reqCtx);
      const acadTerms = resolved ?? (await defaultCaller());
      // listAcadTerms() already falls back to a direct DB fetch outside the
      // Next.js runtime, but surface a clean empty-terms payload (not a 500)
      // if the DB itself is unreachable from the MCP process.
      let terms: Array<{
        id: string;
        label: string;
        startDt: Date;
        endDt: Date;
      }>;
      let currentTermId: string | null = null;
      try {
        terms = await acadTerms.acadTerms.list();
        try {
          const current = await acadTerms.acadTerms.current?.();
          currentTermId = current?.id ?? null;
        } catch {
          currentTermId = null;
        }
      } catch (e) {
        terms = [];
        console.error(
          "[mcp] catalog://acad-terms failed, returning empty terms:",
          e instanceof Error ? e.message : String(e),
        );
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ terms, currentTermId }, null, 2),
          },
        ],
      };
    },
  );
}
