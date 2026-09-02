import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Regression guard for the `tools/list` schema-serialization outage (fix round 1).
 *
 * mcp-use serializes every registered tool's `inputSchema` (io=input) and
 * `outputSchema` (io=output) into the tools/list listing via the zod
 * JSON-Schema converter (zod's `~standard.jsonSchema` — the same engine as
 * `z.toJSONSchema`). Any non-JSON-Schema-representable zod type (z.date(),
 * z.bigint(), ...) throws there and turns tools/list into a -32603 error for
 * EVERY client.
 *
 * The shipped defect: `courseSearchOutput.examTimings[].date` was
 * `z.union([z.string(), z.date()])` (src/mcp/view-tools/schemas.ts) — the old
 * schema fails BOTH tests below ("Date cannot be represented in JSON Schema").
 */

vi.hoisted(() => {
  // src/mcp/server.ts wires OAuth from NODE_ENV: development omits the provider
  // entirely (no bearer middleware), so the real singleton can be probed
  // in-process without Supabase env vars or tokens. Must run before the
  // module imports below (the singleton is constructed at import time).
  // `as Record<...>` — lib.dom/next-env types NODE_ENV as readonly.
  (process.env as Record<string, string>).NODE_ENV = "development";
});

const { buildToolContext } = vi.hoisted(() => ({ buildToolContext: vi.fn() as Mock }));
vi.mock("./user", () => ({ buildToolContext }));
vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: vi.fn().mockResolvedValue({ ok: true, retryAfterSeconds: 0 }),
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: vi.fn().mockResolvedValue({ mcpRateLimitPerMinute: 60 }),
  getRateLimitWindowMinutes: () => 1,
}));

import { z } from "zod";
import { allTools } from "@/server/mcp/tools";
// Importing the 7 view-tool modules registers them on the shared server
// singleton (module-scope `server.tool(...)` calls) — same as src/mcp/index.ts.
import "./view-tools/search-courses";
import "./view-tools/my-bid-plan";
import "./view-tools/get-my-roadmap";
import "./view-tools/get-course-reviews";
import "./view-tools/explore-bid-options";
import "./view-tools/recommend-bid-amount";
import "./view-tools/get-timetable-calendar-link";
import { registerViewlessTools, viewBoundNames } from "./register";
import { server } from "./server";
import {
  bidExplorerOutput,
  bidPlanOutput,
  bidRecommendationOutput,
  calendarLinksOutput,
  courseSearchOutput,
  reviewCardsOutput,
  roadmapOutput,
} from "./view-tools/schemas";

const VIEW_OUTPUTS: Array<[string, z.ZodType]> = [
  ["search-courses", courseSearchOutput],
  ["my-bid-plan", bidPlanOutput],
  ["get-my-roadmap", roadmapOutput],
  ["get-course-reviews", reviewCardsOutput],
  ["explore-bid-options", bidExplorerOutput],
  ["recommend-bid-amount", bidRecommendationOutput],
  ["get-timetable-calendar-link", calendarLinksOutput],
];

describe("every MCP tool schema is JSON-Schema serializable", () => {
  it("all 49 catalog inputSchemas convert (io=input)", () => {
    const failures: string[] = [];
    for (const tool of allTools) {
      try {
        z.toJSONSchema(tool.inputSchema, { target: "draft-2020-12", io: "input" });
      } catch (e) {
        failures.push(`${tool.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    expect(failures, `unserializable inputSchemas:\n${failures.join("\n")}`).toEqual([]);
  });

  it("all 7 view-tool outputSchemas convert (io=output)", () => {
    const failures: string[] = [];
    for (const [name, schema] of VIEW_OUTPUTS) {
      try {
        z.toJSONSchema(schema, { target: "draft-2020-12", io: "output" });
      } catch (e) {
        failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    expect(failures, `unserializable outputSchemas:\n${failures.join("\n")}`).toEqual([]);
  });

  it("tools/list over the real server returns 49 tools with no -32603", async () => {
    // The server's 7 view-bound tools require primed views at mount (the CLI
    // does this automatically in dev/build; a unit test must do it itself).
    // `__primeViews` is mcp-use's string-keyed priming alias — the seam used
    // when the registerViews symbol export cannot be shared across module
    // copies. Inline entries are the minimal legal shape (no assets needed
    // for a JSON-RPC listing probe).
    const viewNames = [
      "course-search",
      "bid-plan",
      "roadmap-view",
      "review-cards",
      "bid-explorer",
      "bid-recommendation",
      "calendar-links",
    ];
    const prime = server as unknown as {
      __primeViews: (views: Record<string, { kind: "inline"; js: string; css: string }>) => void;
    };
    prime.__primeViews(Object.fromEntries(viewNames.map((n) => [n, { kind: "inline" as const, js: "", css: "" }])));
    registerViewlessTools(server);
    const res = await server.fetch(
      new Request("http://localhost/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    // mcp-use answers with SSE frames; tolerate a plain JSON body too.
    let payload: unknown;
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      const dataLine = body.split("\n").find((l) => l.startsWith("data:"));
      expect(dataLine, `no data frame in SSE body:\n${body}`).toBeDefined();
      payload = JSON.parse(dataLine!.slice("data:".length).trim()) as unknown;
    }
    const { result, error } = payload as {
      result?: { tools: Array<{ name: string; inputSchema?: { type?: string }; outputSchema?: { type?: string } }> };
      error?: { code: number; message: string };
    };
    // The z.date() defect surfaced exactly here: -32603 "Date cannot be
    // represented in JSON Schema" instead of a listing.
    expect(error).toBeUndefined();
    const tools = result?.tools ?? [];
    expect(tools).toHaveLength(allTools.length);
    expect(tools.map((t) => t.name).sort()).toEqual(allTools.map((t) => t.name).sort());
    // Every schema was really serialized (not silently stripped):
    for (const t of tools) {
      expect(t.inputSchema?.type, `${t.name}.inputSchema`).toBe("object");
      if (viewBoundNames.has(t.name)) {
        expect(t.outputSchema?.type, `${t.name}.outputSchema`).toBe("object");
      }
    }
  });
});
