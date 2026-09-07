import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { fakeRunA, fakeRunB } = vi.hoisted(() => ({
  fakeRunA: vi.fn() as Mock,
  fakeRunB: vi.fn() as Mock,
}));

const { checkAndIncrementMock, getChatConfigMock } = vi.hoisted(() => ({
  checkAndIncrementMock: vi.fn() as Mock,
  getChatConfigMock: vi.fn() as Mock,
}));

const { buildToolContextMock } = vi.hoisted(() => ({
  buildToolContextMock: vi.fn() as Mock,
}));

vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: checkAndIncrementMock,
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: getChatConfigMock,
  getRateLimitWindowMinutes: () => 1,
}));

vi.mock("@/server/mcp/tools", () => ({
  allTools: [
    { name: "tool-a", description: "A", inputSchema: {}, run: fakeRunA },
    {
      name: "tool-b",
      description: "B",
      inputSchema: {},
      readOnly: true,
      run: fakeRunB,
    },
    // Catalog entries backing the 7 view-bound adapters imported (via
    // register.ts) at module scope: each adapter resolves its tool with
    // `allTools.find((t) => t.name === "...")!` and reads `.description` /
    // `.inputSchema` at import time, so every name must be present.
    ...[
      "search-courses",
      "get-timetable-calendar-link",
      "my-bid-plan",
      "get-my-roadmap",
      "get-course-reviews",
      "explore-bid-options",
      "get-my-timetable-detail",
    ].map((name) => ({ name, description: "D", inputSchema: {} })),
  ],
}));
vi.mock("@/server/mcp/types", () => ({
  okText: (text: string) => ({ content: [{ type: "text", text }] }),
  errText: (text: string) => ({
    content: [{ type: "text", text }],
    isError: true,
  }),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));
vi.mock("server-only", () => ({}));
vi.mock("./user", () => ({
  buildToolContext: buildToolContextMock,
}));
// Single mock for mcp-use — the v2 package has no `mcp-use/server` subpath,
// so there is nothing else to stub.
vi.mock("mcp-use", () => ({
  MCPServer: vi.fn(),
}));

// register.ts imports the 7 view-tools adapters (deriving viewBoundNames from
// their ToolRefs); each adapter calls the real `server.tool(...)` at module
// scope and register.ts reads each ToolRef's `.name`, so stub the singleton
// with a registrar returning `{ name }` (the runtime ToolRef shape). The
// register loop itself takes the server as a parameter, so this mock cannot
// affect the registration assertions below.
const { serverTool } = vi.hoisted(() => ({
  serverTool: vi.fn((def: { name: string }) => ({ name: def.name })) as Mock,
}));
vi.mock("./server", () => ({ server: { tool: serverTool } }));

import { registerViewlessTools, viewBoundNames } from "./register";
import { getToolAnnotations, getToolRegistration } from "./register";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkDestructiveConfirm } from "./rate-limit";
import { errText, okText } from "@/server/mcp/types";
import { allTools } from "@/server/mcp/tools";

const fakeCtx = {
  user: { id: "u1" } as never,
  caller: {} as never,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  getChatConfigMock.mockResolvedValue({ mcpRateLimitPerMinute: 60 });
  checkAndIncrementMock.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  buildToolContextMock.mockResolvedValue(fakeCtx);
});

describe("registerViewlessTools", () => {
  it("registers every non-view-bound tool with name, description and readOnly annotation", () => {
    const tool = vi.fn();
    const server = { tool } as never;
    registerViewlessTools(server);
    expect(tool).toHaveBeenCalledTimes(2);
    expect(tool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "tool-a", description: "A" }),
      expect.any(Function),
    );
    expect(tool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "tool-b",
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
          idempotentHint: true,
        },
      }),
      expect.any(Function),
    );
    // No view/outputSchema for viewless tools
    for (const call of (tool as unknown as Mock).mock.calls) {
      const def = call[0] as Record<string, unknown>;
      expect(def.view).toBeUndefined();
      expect(def.outputSchema).toBeUndefined();
    }
  });

  it("viewBoundNames contains exactly the 7 view-bound tools", () => {
    expect(viewBoundNames).toEqual(
      new Set([
        "search-courses",
        "get-timetable-calendar-link",
        "my-bid-plan",
        "get-my-roadmap",
        "get-course-reviews",
        "explore-bid-options",
        "get-my-timetable-detail",
      ]),
    );
    expect(viewBoundNames.size).toBe(7);
  });

  it("viewBoundNames is derived from ToolRefs, not hardcoded literals", () => {
    // Pins the Task 2 invariant without importing the real view-tools
    // adapters (their module scope needs a full `allTools` catalog): none
    // of the 7 tool names may appear as a string literal in register.ts, so
    // a rename of any ToolRef breaks loudly (undefined `.name`) instead of
    // silently double-registering. Iterates the hardcoded expectation (not
    // the derived set) so the test cannot pass vacuously on an empty set.
    const source = readFileSync(
      fileURLToPath(new URL("./register.ts", import.meta.url)),
      "utf8",
    );
    for (const name of [
      "search-courses",
      "get-timetable-calendar-link",
      "my-bid-plan",
      "get-my-roadmap",
      "get-course-reviews",
      "explore-bid-options",
      "get-my-timetable-detail",
    ]) {
      expect(
        source.includes(`"${name}"`) ||
          source.includes(`'${name}'`) ||
          source.includes(`\`${name}\``),
        `register.ts must not hardcode tool-name literal ${name}`,
      ).toBe(false);
    }
  });

  it("skips view-bound tools when they appear in allTools", async () => {
    // Temporarily add a view-bound tool to allTools and ensure it's skipped
    const original = [...(allTools as unknown[])];
    (allTools as unknown as unknown[]).push({
      name: "search-courses",
      description: "Search courses",
      inputSchema: {},
      readOnly: true,
      run: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "should-not-register" }],
      }),
    });
    const tool = vi.fn();
    registerViewlessTools({ tool } as never);
    // Should still only register the 2 non-view-bound tools, not the injected view-bound one
    expect(tool).toHaveBeenCalledTimes(2);
    expect(tool).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: "search-courses" }),
      expect.any(Function),
    );
    // Restore
    (allTools as unknown as unknown[]).length = 0;
    for (const t of original) (allTools as unknown as unknown[]).push(t);
  });

  it("invokes the tool handler and maps its result; never throws", async () => {
    fakeRunA.mockResolvedValue(okText("result-a"));
    fakeRunB.mockRejectedValue(new Error("boom-b"));
    type CapturedHandler = (
      args: Record<string, unknown>,
      mcpCtx?: unknown,
    ) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerViewlessTools({ tool } as never);
    const ra = await captured[0]!({});
    expect(ra.content).toMatchObject([{ type: "text", text: "<tool_output>\nresult-a\n</tool_output>" }]);
    expect(ra.isError).toBeUndefined();
    const rb = await captured[1]!({});
    expect(rb.isError).toBe(true);
    // thrown run errors become the Internal-error envelope (no rethrow)
    expect(rb.content?.[0]?.text).toBe("Internal error in tool tool-b");
  });

  it("rate-limits write tools via DB checkAndIncrement and read tools via a separate read bucket", async () => {
    fakeRunA.mockResolvedValue(okText("should-not-reach"));
    fakeRunB.mockResolvedValue(okText("b-ok"));

    type CapturedHandler = (
      args: Record<string, unknown>,
      mcpCtx?: unknown,
    ) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerViewlessTools({ tool } as never);
    expect(captured).toHaveLength(2);

    // write tool (tool-a) hits the write bucket -> blocked, run NOT called
    checkAndIncrementMock.mockClear();
    fakeRunA.mockClear();
    checkAndIncrementMock.mockResolvedValueOnce({
      ok: false,
      retryAfterSeconds: 12,
    });
    const writeResult = await captured[0]!(
      {},
      { auth: { user: { id: "u1", email: "a@b" } } },
    );
    expect(checkAndIncrementMock).toHaveBeenCalledWith("mcp-write:u1", 60, 1);
    expect(fakeRunA).not.toHaveBeenCalled();
    expect(writeResult.isError).toBe(true);
    // blocked result carries the friendly rate-limit message
    expect(writeResult.content?.[0]?.text).toMatch(/rate limit/i);

    // readOnly tool (tool-b) -> draws from its own read bucket, run proceeds
    checkAndIncrementMock.mockClear();
    fakeRunB.mockClear();
    const readResult = await captured[1]!(
      {},
      { auth: { user: { id: "u1", email: "a@b" } } },
    );
    expect(checkAndIncrementMock).toHaveBeenCalledWith("mcp-read:u1", 60, 1);
    expect(fakeRunB).toHaveBeenCalledTimes(1);
    expect(readResult).toMatchObject({
      content: [{ type: "text", text: "<tool_output>\nb-ok\n</tool_output>" }],
    });
  });

  it("blocks readOnly tools when the read bucket is exhausted", async () => {
    fakeRunB.mockResolvedValue(okText("should-not-reach"));
    type CapturedHandler = (
      args: Record<string, unknown>,
      mcpCtx?: unknown,
    ) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerViewlessTools({ tool } as never);
    checkAndIncrementMock.mockClear();
    fakeRunB.mockClear();
    checkAndIncrementMock.mockResolvedValueOnce({
      ok: false,
      retryAfterSeconds: 9,
    });
    const result = await captured[1]!(
      {},
      { auth: { user: { id: "u1", email: "a@b" } } },
    );
    expect(checkAndIncrementMock).toHaveBeenCalledWith("mcp-read:u1", 60, 1);
    expect(fakeRunB).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toMatch(/read rate limit/i);
  });

  it("get-shared-timetable consumes the read budget (share-token spray mitigation)", async () => {
    // A readOnly tool on the viewless/register path (where token-guessing
    // spray would land) draws from the mcp-read: bucket — not the write
    // bucket, and never unbounded.
    const run = vi.fn().mockResolvedValue(okText("shared-ok"));
    const original = [...(allTools as unknown[])];
    (allTools as unknown as unknown[]).push({
      name: "get-shared-timetable",
      description: "View a timetable shared via a share-link token.",
      inputSchema: {},
      readOnly: true,
      run,
    });
    try {
      type CapturedHandler = (
        args: Record<string, unknown>,
        mcpCtx?: unknown,
      ) => Promise<{
        isError?: boolean;
        content: Array<{ type: string; text?: string }>;
      }>;
      const captured: CapturedHandler[] = [];
      const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
        captured.push(handler);
      });
      registerViewlessTools({ tool } as never);
      const handler = captured[captured.length - 1]!;
      checkAndIncrementMock.mockClear();
      run.mockClear();
      const result = await handler(
        { token: "tok123" },
        { auth: { user: { id: "u1" } } },
      );
      expect(checkAndIncrementMock).toHaveBeenCalledWith("mcp-read:u1", 60, 1);
      expect(checkAndIncrementMock).not.toHaveBeenCalledWith(
        "mcp-write:u1",
        expect.anything(),
        expect.anything(),
      );
      expect(run).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        content: [{ type: "text", text: "<tool_output>\nshared-ok\n</tool_output>" }],
      });
    } finally {
      (allTools as unknown as unknown[]).length = 0;
      for (const t of original) (allTools as unknown as unknown[]).push(t);
    }
  });

  it("returns Unauthorized when buildToolContext returns undefined", async () => {
    buildToolContextMock.mockResolvedValue(undefined);
    type CapturedHandler = (
      args: Record<string, unknown>,
      mcpCtx?: unknown,
    ) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerViewlessTools({ tool } as never);
    const result = await captured[0]!({}, {});
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toMatch(/Unauthorized/);
    expect(fakeRunA).not.toHaveBeenCalled();
  });

  it("maps tool run isError to error envelope", async () => {
    buildToolContextMock.mockResolvedValue(fakeCtx);
    // reset rate-limit mock that was consumed by earlier test's mockResolvedValueOnce
    checkAndIncrementMock.mockReset();
    checkAndIncrementMock.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
    fakeRunA.mockResolvedValue(errText("bad input"));
    type CapturedHandler = (
      args: Record<string, unknown>,
      mcpCtx?: unknown,
    ) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerViewlessTools({ tool } as never);
    const result = await captured[0]!({}, { auth: { user: { id: "u1" } } });
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toBe("bad input");
  });

  it("viewless tools return raw text envelope (no structuredContent)", async () => {
    buildToolContextMock.mockResolvedValue(fakeCtx);
    fakeRunA.mockResolvedValue(okText(JSON.stringify({ foo: "bar" })));
    type CapturedHandler = (
      args: Record<string, unknown>,
      mcpCtx?: unknown,
    ) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
      structuredContent?: unknown;
      _meta?: unknown;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerViewlessTools({ tool } as never);
    const result = await captured[0]!({}, { auth: { user: { id: "u1" } } });
    // Task 7: dispatch wraps success text in <tool_output> delimiters; the
    // envelope stays raw text (no structuredContent/_meta).
    expect(result.content?.[0]?.text).toBe(
      `<tool_output>\n${JSON.stringify({ foo: "bar" })}\n</tool_output>`,
    );
    expect(result.structuredContent).toBeUndefined();
    expect(result._meta).toBeUndefined();
  });

  describe("tool annotations (Task 6 hints plumbing)", () => {
    it("marks destructive tools with destructiveHint", () => {
      expect(getToolAnnotations("remove-timetable").destructiveHint).toBe(true);
    });

    it("marks readOnly tools readOnly+idempotent, never destructive", () => {
      // tool-b is the mocked readOnly tool (not in the destructive set).
      expect(getToolAnnotations("tool-b")).toMatchObject({
        title: "Tool B",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      });
    });

    it("marks constructive writes non-destructive and non-idempotent", () => {
      // tool-a is the mocked write tool (not in the destructive set).
      expect(getToolAnnotations("tool-a")).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      });
    });

    it("surfaces the confirm:true requirement in destructive descriptions", () => {
      const destructive = getToolRegistration("remove-timetable");
      expect(destructive.description).toContain("confirm:true");
      expect(destructive.title).toBe("Remove Timetable");
      // Non-destructive descriptions pass through verbatim.
      expect(getToolRegistration("tool-b").description).toBe("B");
    });

    it("registers viewless tools with title + full annotations", () => {
      const tool = vi.fn();
      registerViewlessTools({ tool } as never);
      expect(tool).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "tool-b",
          title: "Tool B",
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false,
            idempotentHint: true,
          },
        }),
        expect.any(Function),
      );
    });
  });

  describe("destructive confirm gate", () => {
    type CapturedHandler = (
      args: Record<string, unknown>,
      mcpCtx?: unknown,
    ) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;

    function withDestructiveTool(run: Mock, name = "remove-timetable") {
      const original = [...(allTools as unknown[])];
      (allTools as unknown as unknown[]).push({
        name,
        description: "Delete one of the user's timetables.",
        inputSchema: {},
        run,
      });
      return () => {
        (allTools as unknown as unknown[]).length = 0;
        for (const t of original) (allTools as unknown as unknown[]).push(t);
      };
    }

    function captureHandlers() {
      const captured: CapturedHandler[] = [];
      const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
        captured.push(handler);
      });
      registerViewlessTools({ tool } as never);
      return captured;
    }

    it("blocks remove-timetable without confirm:true and does not run the tool", async () => {
      // The repo .env sets MCP_DEV_BYPASS=true (loaded into vitest via
      // loadEnv) — stub it off so the prod gate path is exercised.
      vi.stubEnv("MCP_DEV_BYPASS", "");
      const run = vi.fn().mockResolvedValue(okText("deleted"));
      const restore = withDestructiveTool(run);
      try {
        const captured = captureHandlers();
        const remove = captured[captured.length - 1]!;
        const result = await remove(
          { timetableId: "tt1" },
          { auth: { user: { id: "u1" } } },
        );
        expect(result.isError).toBe(true);
        expect(result.content?.[0]?.text).toMatch(/confirm/i);
        expect(run).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    it("runs remove-timetable with confirm:true", async () => {
      vi.stubEnv("MCP_DEV_BYPASS", "");
      const run = vi.fn().mockResolvedValue(okText("deleted"));
      const restore = withDestructiveTool(run);
      try {
        const captured = captureHandlers();
        const remove = captured[captured.length - 1]!;
        const result = await remove(
          { timetableId: "tt1", confirm: true },
          { auth: { user: { id: "u1" } } },
        );
        expect(run).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
          content: [{ type: "text", text: "<tool_output>\ndeleted\n</tool_output>" }],
        });
      } finally {
        restore();
      }
    });

    it("does not gate constructive writes (tool-a runs without confirm)", async () => {
      fakeRunA.mockResolvedValue(okText("created"));
      const captured = captureHandlers();
      const result = await captured[0]!(
        { name: "x" },
        { auth: { user: { id: "u1" } } },
      );
      expect(fakeRunA).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        content: [{ type: "text", text: "<tool_output>\ncreated\n</tool_output>" }],
      });
    });

    it("dev bypass skips the confirm gate in development (local Inspector testing)", async () => {
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      vi.stubEnv("NODE_ENV", "development");
      const run = vi.fn().mockResolvedValue(okText("deleted"));
      const restore = withDestructiveTool(run);
      try {
        const captured = captureHandlers();
        const remove = captured[captured.length - 1]!;
        const result = await remove(
          { timetableId: "tt1" },
          { auth: { user: { id: "u1" } } },
        );
        expect(run).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
          content: [{ type: "text", text: "<tool_output>\ndeleted\n</tool_output>" }],
        });
      } finally {
        restore();
        vi.unstubAllEnvs();
      }
    });

    it("test env does NOT get the dev bypass (confirm gate still applies)", async () => {
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      vi.stubEnv("NODE_ENV", "test");
      const run = vi.fn().mockResolvedValue(okText("deleted"));
      const restore = withDestructiveTool(run);
      try {
        const captured = captureHandlers();
        const remove = captured[captured.length - 1]!;
        const result = await remove(
          { timetableId: "tt1" },
          { auth: { user: { id: "u1" } } },
        );
        expect(result.isError).toBe(true);
        expect(result.content?.[0]?.text).toMatch(/confirm/i);
        expect(run).not.toHaveBeenCalled();
      } finally {
        restore();
        vi.unstubAllEnvs();
      }
    });

    it("production NODE_ENV keeps the confirm gate even with MCP_DEV_BYPASS=true", async () => {
      vi.stubEnv("MCP_DEV_BYPASS", "true");
      vi.stubEnv("NODE_ENV", "production");
      const run = vi.fn().mockResolvedValue(okText("deleted"));
      const restore = withDestructiveTool(run);
      try {
        const captured = captureHandlers();
        const remove = captured[captured.length - 1]!;
        const result = await remove(
          { timetableId: "tt1" },
          { auth: { user: { id: "u1" } } },
        );
        expect(result.isError).toBe(true);
        expect(result.content?.[0]?.text).toMatch(/confirm/i);
        expect(run).not.toHaveBeenCalled();
      } finally {
        restore();
        vi.unstubAllEnvs();
      }
    });

    // NOTE: get-timetable-calendar-link is view-bound (registered by its
    // adapter, skipped by registerViewlessTools), so it is NOT covered by
    // these two handler-based blocks — its gate is pinned at the adapter
    // level in get-timetable-calendar-link.test.ts. It IS in the
    // checkDestructiveConfirm list below.
    it.each([
      "save-roadmap-entries", // full-replace: entries:[] wipes the roadmap
      "save-bids", // bulk overwrite of bid state
      "set-bid-status", // flips financial status
      "set-bid-budget", // rewrites spendable e-credits
      "set-timetable-visibility", // publishes/hides user data
      "set-roadmap-visibility", // publishes/hides user data
      "upsert-bid", // single-write loop replicates bulk wipes
      "create-timetable",
      "rename-timetable",
      "add-class-to-timetable",
      "create-roadmap",
      "rename-roadmap",
      "upsert-roadmap-entry",
      "set-matric-term",
      "set-active-roadmap",
      "sync-roadmap-progress",
      "copy-public-roadmap",
    ])(
      "blocks %s without confirm:true and does not run the tool",
      async (name) => {
        vi.stubEnv("MCP_DEV_BYPASS", "");
        const run = vi.fn().mockResolvedValue(okText("written"));
        const restore = withDestructiveTool(run, name);
        try {
          const captured = captureHandlers();
          const handler = captured[captured.length - 1]!;
          const result = await handler({}, { auth: { user: { id: "u1" } } });
          expect(result.isError).toBe(true);
          expect(result.content?.[0]?.text).toContain("confirm:true");
          expect(run).not.toHaveBeenCalled();
        } finally {
          restore();
        }
      },
    );

    it.each([
      "save-roadmap-entries",
      "save-bids",
      "set-bid-status",
      "set-bid-budget",
      "set-timetable-visibility",
      "set-roadmap-visibility",
      "upsert-bid",
      "create-timetable",
      "rename-timetable",
      "add-class-to-timetable",
      "create-roadmap",
      "rename-roadmap",
      "upsert-roadmap-entry",
      "set-matric-term",
      "set-active-roadmap",
      "sync-roadmap-progress",
      "copy-public-roadmap",
    ])("runs %s with confirm:true", async (name) => {
      vi.stubEnv("MCP_DEV_BYPASS", "");
      const run = vi.fn().mockResolvedValue(okText("written"));
      const restore = withDestructiveTool(run, name);
      try {
        const captured = captureHandlers();
        const handler = captured[captured.length - 1]!;
        const result = await handler(
          { confirm: true },
          { auth: { user: { id: "u1" } } },
        );
        expect(run).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
          content: [{ type: "text", text: "<tool_output>\nwritten\n</tool_output>" }],
        });
      } finally {
        restore();
      }
    });

    it.each([
      "save-roadmap-entries",
      "save-bids",
      "set-bid-status",
      "set-bid-budget",
      "set-timetable-visibility",
      "set-roadmap-visibility",
      "upsert-bid",
      "create-timetable",
      "rename-timetable",
      "add-class-to-timetable",
      "get-timetable-calendar-link",
      "create-roadmap",
      "rename-roadmap",
      "upsert-roadmap-entry",
      "set-matric-term",
      "set-active-roadmap",
      "sync-roadmap-progress",
      "copy-public-roadmap",
    ])("checkDestructiveConfirm requires confirm:true for %s", (name) => {
      expect(checkDestructiveConfirm(name, {})).toContain("confirm:true");
      expect(checkDestructiveConfirm(name, { confirm: true })).toBeNull();
    });
  });
});
