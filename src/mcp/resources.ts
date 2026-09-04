import type { MCPServer } from "mcp-use";
import { db } from "@/server/db";
import { createCaller } from "@/server/api/root";

export type AcadTermsCaller = {
  acadTerms: {
    list: () => Promise<Array<{ id: string; label: string; startDt: Date; endDt: Date }>>;
    current?: () => Promise<{ id: string } | null>;
  };
};

async function defaultCaller(): Promise<AcadTermsCaller> {
  return createCaller(async () => ({ db, session: null, headers: new Headers() }));
}

export function registerResources(server: MCPServer, caller?: AcadTermsCaller): void {
  server.resource(
    {
      name: "Academic terms",
      uri: "catalog://acad-terms",
      description: "The academic terms the course catalog is offered in (id = acadTermId used by search-courses and plan-semester).",
      mimeType: "application/json",
    },
    async (uri, _ctx) => {
      const acadTerms = caller ?? (await defaultCaller());
      // listAcadTerms() already falls back to a direct DB fetch outside the
      // Next.js runtime, but surface a clean empty-terms payload (not a 500)
      // if the DB itself is unreachable from the MCP process.
      let terms: Array<{ id: string; label: string; startDt: Date; endDt: Date }>;
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