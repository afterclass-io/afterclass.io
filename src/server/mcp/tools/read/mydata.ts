import { z } from "zod";

import {
  capPage,
  pageByCursor,
  stripSecretsFromValue,
} from "@/mcp/output-policy";
import { resolveTermId } from "../../current";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";
import { stripBidNotes } from "../bid-shared";

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
      const timetables = (await caller.timetable.listMine({
        acadTermId: term.value,
      })) as Array<Record<string, unknown>>;
      // Bearer tokens must not reach the LLM (canonical deep-strip).
      const scrubbed = timetables.map((t) => stripSecretsFromValue(t));
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
    .describe(
      "Filter to one academic term; omit to use the current academic term — includes all bid windows",
    ),
  limit: z.number().int().min(1).max(50).default(20),
  // Optional cursor into the filtered bid page (opaque item id from a
  // previous page's nextCursor). Additive only: when omitted the first page
  // is returned and the payload gains a nextCursor key.
  cursor: z.string().optional(),
});

export const myBidsTool: McpTool<typeof myBidsSchema> = {
  name: "my-bids",
  description: "List the user's own saved bids.",
  inputSchema: myBidsSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    // Central pagination policy: clamp through `capPage` (defaults match
    // this schema: limit default 20, max 50) so the clamp lives in one place.
    const { acadTermId, limit, cursor } = {
      ...capPage(input as { acadTermId?: string; limit?: number }),
      cursor: (input as { cursor?: string }).cursor,
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
      const scrubbed = bids.map((bid) => stripBidNotes(bid));
      const filtered = scrubbed.filter(
        (b) =>
          (b as { bidWindow?: { acadTermId?: string } }).bidWindow
            ?.acadTermId === term.value,
      );
      // Shared cursor pagination (Task 11: pageByCursor) over the in-memory
      // term-filtered page (listMine has no cursor support at the router):
      // cursor is the previous page's last item id; unknown cursors restart
      // from the first page. nextCursor is always present (null on the last
      // page) so clients can page forward.
      const { items: page, nextCursor } = pageByCursor(
        filtered,
        (b) => (b as { id?: string }).id,
        cursor,
        limit,
      );
      return jsonText({ items: page, nextCursor });
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
      return jsonText(
        await caller.userBids.getBudget({ acadTermId: term.value }),
      );
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
      const roadmaps = (await caller.roadmaps.listMine()) as Array<
        Record<string, unknown>
      >;
      // Bearer tokens must not reach the LLM (canonical deep-strip).
      const scrubbed = roadmaps.map((r) => stripSecretsFromValue(r));
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

export const browsePublicRoadmapsTool: McpTool<
  typeof browsePublicRoadmapsSchema
> = {
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

export const getSharedTimetableTool: McpTool<typeof getSharedTimetableSchema> =
  {
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
