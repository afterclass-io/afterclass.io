import { z } from "zod";

import { resolveTermId } from "../../current";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const myTimetablesSchema = z.object({ acadTermId: z.string().optional() });

export const myTimetablesTool: McpTool<typeof myTimetablesSchema> = {
  name: "my-timetables",
  description: "List the user's own timetables for an academic term.",
  inputSchema: myTimetablesSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    const { acadTermId } = input;
    try {
      const term = await resolveTermId(caller, acadTermId);
      if (!term.ok) return errText(term.errText);
      const timetables = (await caller.timetable.listMine({ acadTermId: term.value })) as Array<
        Record<string, unknown>
      >;
      const scrubbed = timetables.map((t) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- bearer tokens must not reach the LLM
        const { shareToken: _s, icalToken: _i, ...rest } = t as Record<string, unknown> & {
          shareToken?: unknown;
          icalToken?: unknown;
        };
        return rest;
      });
      return jsonText(scrubbed);
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const myBidsSchema = z.object({
  acadTermId: z
    .string()
    .optional()
    .describe("Filter to one academic term; omit to use the current academic term — includes all bid windows"),
  limit: z.number().int().min(1).max(50).default(20),
});

export const myBidsTool: McpTool<typeof myBidsSchema> = {
  name: "my-bids",
  description: "List the user's own saved bids.",
  inputSchema: myBidsSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    const { acadTermId, limit = 20 } = input as {
      acadTermId?: string;
      limit?: number;
    };
    try {
      // Omitted/empty acadTermId defaults to the current term (all bid windows
      // within that term are kept via the bidWindow.acadTermId filter below).
      const term = await resolveTermId(caller, acadTermId);
      if (!term.ok) return errText(term.errText);
      const bids = await caller.userBids.listMine();
      // my-bids is exposed over MCP: strip the free-text `notes` field (user
      // PII / private bidding strategy) from the AI-visible output. All other
      // metadata (amount, status, class, window, result) is preserved.
      const scrubbed = bids.map((bid) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- notes is deliberately stripped from MCP output
        const { notes: _notes, ...rest } = bid;
        return rest;
      });
      const filtered = scrubbed.filter(
        (b) => (b as { bidWindow?: { acadTermId?: string } }).bidWindow?.acadTermId === term.value,
      );
      return jsonText(filtered.slice(0, limit));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const myBudgetSchema = z.object({ acadTermId: z.string().optional() });

export const myBudgetTool: McpTool<typeof myBudgetSchema> = {
  name: "my-bid-budget",
  description: "Get the user's bid budget balance for an academic term.",
  inputSchema: myBudgetSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    const { acadTermId } = input;
    try {
      const term = await resolveTermId(caller, acadTermId);
      if (!term.ok) return errText(term.errText);
      return jsonText(await caller.userBids.getBudget({ acadTermId: term.value }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const myRoadmapsSchema = z.object({});

export const myRoadmapsTool: McpTool<typeof myRoadmapsSchema> = {
  name: "my-roadmaps",
  description: "List the user's own study roadmaps.",
  inputSchema: myRoadmapsSchema,
  readOnly: true,
  run: async ({ caller }) => {
    try {
      const roadmaps = (await caller.roadmaps.listMine()) as Array<Record<string, unknown>>;
      const scrubbed = roadmaps.map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- shareToken is a bearer secret
        const { shareToken: _s, ...rest } = r as Record<string, unknown> & {
          shareToken?: unknown;
        };
        return rest;
      });
      return jsonText(scrubbed);
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const browsePublicRoadmapsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const browsePublicRoadmapsTool: McpTool<typeof browsePublicRoadmapsSchema> = {
  name: "browse-public-roadmaps",
  description:
    "Browse roadmaps other users have published publicly (metadata: name, description, entry count, upvotes, faculty). Use get-public-roadmap with the returned id to see the actual course entries.",
  inputSchema: browsePublicRoadmapsSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      return jsonText(await caller.roadmaps.listPublic(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getSharedTimetableSchema = z.object({
  token: z.string().describe("The share token from a shared timetable link"),
});

export const getSharedTimetableTool: McpTool<typeof getSharedTimetableSchema> = {
  name: "get-shared-timetable",
  description: "View a timetable that was shared via a share-link token.",
  inputSchema: getSharedTimetableSchema,
  readOnly: true,
  run: async ({ caller }, { token }) => {
    try {
      return jsonText(await caller.sharing.getSharedTimetable({ token }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
