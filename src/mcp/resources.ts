import type { MCPServer } from "mcp-use";

export type AcadTermsCaller = { acadTerms: { list: () => Promise<Array<{ id: string; label: string; startDt: Date; endDt: Date }>> } };

async function defaultCaller(): Promise<AcadTermsCaller> {
  const [{ db }, { createCaller }] = await Promise.all([import("@/server/db"), import("@/server/api/root")]);
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
      const terms = await acadTerms.acadTerms.list();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ terms }, null, 2),
          },
        ],
      };
    },
  );
}