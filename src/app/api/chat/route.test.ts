import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// -- vi.hoisted mocks (TDZ-safe) ------------------------------------------
const {
  mockAuth,
  mockBeginTurn,
  mockEndTurn,
  mockReserveMessage,
  mockSettleUsage,
  mockRefundMessage,
  mockCheckAndIncrement,
  mockGetChatConfig,
  mockGetModel,
  mockBuildAssistantTools,
  mockTrimToBudget,
  mockCreateCallerForUser,
  mockIsLlmConfigured,
  mockGetAiConsentDate,
} = vi.hoisted(() => ({
  mockAuth: vi.fn() as Mock,
  mockBeginTurn: vi.fn() as Mock,
  mockEndTurn: vi.fn() as Mock,
  mockReserveMessage: vi.fn() as Mock,
  mockSettleUsage: vi.fn() as Mock,
  mockRefundMessage: vi.fn() as Mock,
  mockCheckAndIncrement: vi.fn() as Mock,
  mockGetChatConfig: vi.fn() as Mock,
  mockGetModel: vi.fn() as Mock,
  mockBuildAssistantTools: vi.fn() as Mock,
  mockTrimToBudget: vi.fn() as Mock,
  mockCreateCallerForUser: vi.fn() as Mock,
  mockIsLlmConfigured: vi.fn() as Mock,
  mockGetAiConsentDate: vi.fn() as Mock,
}));

// -- vi.mock calls ---------------------------------------------------------
vi.mock("@/server/auth", () => ({ auth: mockAuth }));
vi.mock("@/server/assistant/quota", () => ({
  beginTurn: mockBeginTurn,
  endTurn: mockEndTurn,
  reserveMessage: mockReserveMessage,
  settleUsage: mockSettleUsage,
  refundMessage: mockRefundMessage,
}));
vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: mockCheckAndIncrement,
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: mockGetChatConfig,
  getChatWriteRateLimit: (c: { rateLimitPerMinute: number }) =>
    c.rateLimitPerMinute,
  getRateLimitWindowMinutes: () => 1,
}));
// Task 8: route.ts now reads the canonical chat-config directly.
vi.mock("@/server/config/chat-config", () => ({
  getChatConfigAsync: mockGetChatConfig,
  getChatWriteRateLimit: (c: { rateLimitPerMinute: number }) =>
    c.rateLimitPerMinute,
  getRateLimitWindowMinutes: () => 1,
}));
vi.mock("@/server/assistant/providers", () => ({
  getModel: mockGetModel,
}));
// Degraded mode (no LLM key): controllable per test; defaults to configured.
vi.mock("@/server/assistant/llm-status", () => ({
  isLlmConfigured: mockIsLlmConfigured,
}));
vi.mock("@/server/assistant/tools", () => ({
  buildAssistantTools: mockBuildAssistantTools,
}));
vi.mock("@/server/assistant/trim", () => ({
  trimToBudget: mockTrimToBudget,
}));
vi.mock("@/server/mcp/caller", () => ({
  createCallerForUser: mockCreateCallerForUser,
}));
vi.mock("@/server/assistant/consent", () => ({
  getAiConsentDate: mockGetAiConsentDate,
}));
// Task 9: route.ts schedules settlement via after() (Vercel waitUntil
// semantics). In tests there is no request scope, so run the work inline —
// the failure-fallback path (real after() throwing) is covered by the
// try/catch in the route itself.
vi.mock("next/server", () => ({
  after: (task: unknown) => {
    if (typeof task === "function") void (task as () => unknown)();
    else void (task as Promise<unknown>);
  },
}));

// stored onEnd callback so the test can invoke it
let capturedOnEnd:
  | ((opts: {
      usage: {
        inputTokens: number;
        outputTokens: number;
        inputTokenDetails?: { cacheReadTokens?: number };
      };
    }) => void)
  | null = null;

// stored onStepFinish callback so the test can invoke it
let capturedOnStepFinish:
  | ((event: {
      usage: {
        inputTokens?: number;
        outputTokens?: number;
        inputTokenDetails?: { cacheReadTokens?: number };
      };
    }) => void)
  | null = null;

vi.mock("ai", () => ({
  streamText: vi.fn().mockImplementation(
    (opts: {
      onEnd?: (event: {
        usage: {
          inputTokens: number;
          outputTokens: number;
          inputTokenDetails?: { cacheReadTokens?: number };
        };
      }) => void;
      onStepFinish?: (event: {
        usage: {
          inputTokens?: number;
          outputTokens?: number;
          inputTokenDetails?: { cacheReadTokens?: number };
        };
      }) => void;
    }) => {
      capturedOnEnd = opts.onEnd ?? null;
      capturedOnStepFinish = opts.onStepFinish ?? null;
      return { stream: new ReadableStream() };
    },
  ),
  createUIMessageStreamResponse: vi
    .fn()
    .mockReturnValue(new Response("ok", { status: 200 })),
  toUIMessageStream: vi
    .fn()
    .mockImplementation(({ stream }: { stream: ReadableStream }) => stream),
  createUIMessageStream: vi.fn().mockReturnValue({}),
  isStepCount: vi.fn(() => () => false),
}));

import { POST } from "@/app/api/chat/route";
import { createUIMessageStreamResponse, streamText } from "ai";

const mockStreamText = vi.mocked(streamText);
const mockCreateUIMessageStreamResponse = vi.mocked(
  createUIMessageStreamResponse,
);

const DEFAULT_CHAT_CONFIG = {
  quotaPerMonth: 50,
  nudgeAt: 40,
  rateLimitPerMinute: 10,
  mcpRateLimitPerMinute: 60,
  writeRateLimitPerMinute: 10,
  rateLimitWindowMinutes: 1,
  maxInputTokens: 16000,
  maxOutputTokens: 4096,
  maxToolRounds: 12,
  settlementSpikeTokens: 30000,
  chatEnabled: true,
  widgetEnabled: true,
  mcpEnabled: true,
};

function buildReq(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    capturedOnEnd = null;
    capturedOnStepFinish = null;
    mockAuth.mockReset();
    mockBeginTurn.mockReset();
    mockEndTurn.mockReset();
    mockReserveMessage.mockReset();
    mockSettleUsage.mockReset();
    mockRefundMessage.mockReset();
    mockCheckAndIncrement.mockReset();
    mockGetChatConfig.mockReset();
    mockGetModel.mockReset();
    mockBuildAssistantTools.mockReset();
    mockTrimToBudget.mockReset();
    mockCreateCallerForUser.mockReset();
    mockIsLlmConfigured.mockReset();
    // Default: user consented (matches consented fixtures); individual
    // tests override with null.
    mockGetAiConsentDate.mockReset();
    mockGetAiConsentDate.mockResolvedValue(new Date("2026-09-09T00:00:00Z"));
    // Default: key configured (matches the real .env under vitest).
    mockIsLlmConfigured.mockReturnValue(true);
    mockStreamText.mockClear();
    mockCreateUIMessageStreamResponse.mockReset();
    mockCreateUIMessageStreamResponse.mockReturnValue(
      new Response("ok", { status: 200 }),
    );

    // defaults: everything passing
    mockGetChatConfig.mockResolvedValue(DEFAULT_CHAT_CONFIG);
    mockBeginTurn.mockReturnValue(true);
    mockReserveMessage.mockResolvedValue({
      ok: true,
      remaining: 49,
      quota: 50,
    });
    mockRefundMessage.mockResolvedValue(undefined);
    mockCheckAndIncrement.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
    mockGetModel.mockResolvedValue("mock-model");
    mockBuildAssistantTools.mockReturnValue({});
    mockTrimToBudget.mockResolvedValue([]);
    mockCreateCallerForUser.mockReturnValue({});
  });

  // -- 401 --
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(401);
  });

  // -- 503 degraded (no LLM key) --
  it("returns 503 without touching quota, rate limit, or LLM when no key is configured", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockIsLlmConfigured.mockReturnValue(false);
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(503);
    expect(await res.text()).toBe("Assistant unavailable");
    expect(mockCheckAndIncrement).not.toHaveBeenCalled();
    expect(mockReserveMessage).not.toHaveBeenCalled();
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  // -- 403 consent --
  it("returns 403 {gate:'consent'} on NULL consent; reserveMessage NOT called", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetAiConsentDate.mockResolvedValue(null);
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { gate: string };
    expect(body.gate).toBe("consent");
    expect(mockReserveMessage).not.toHaveBeenCalled();
    expect(mockCheckAndIncrement).not.toHaveBeenCalled();
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  // -- 503 chat kill-switch (Task 4: after consent 403, before body parse) --
  it("returns 503 'Assistant disabled' when chatEnabled is false; quota/rate/LLM untouched", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetChatConfig.mockResolvedValue({
      ...DEFAULT_CHAT_CONFIG,
      chatEnabled: false,
    });
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(503);
    expect(await res.text()).toBe("Assistant disabled");
    expect(mockCheckAndIncrement).not.toHaveBeenCalled();
    expect(mockReserveMessage).not.toHaveBeenCalled();
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  // Gate precedence (Task 4 fix round): consent-null + chatEnabled=false →
  // 403 consent wins (consent gate sits ahead of the kill-switch).
  it("returns 403 consent (not 503) when unconsented AND chatEnabled is false", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetAiConsentDate.mockResolvedValue(null);
    mockGetChatConfig.mockResolvedValue({
      ...DEFAULT_CHAT_CONFIG,
      chatEnabled: false,
    });
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { gate: string };
    expect(body.gate).toBe("consent");
    expect(mockReserveMessage).not.toHaveBeenCalled();
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  // Kill-switch sits ahead of body parsing: flag-off + malformed body →
  // 503 "Assistant disabled" (the body parser is never reached).
  it("returns 503 'Assistant disabled' for a malformed body when chatEnabled is false", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetChatConfig.mockResolvedValue({
      ...DEFAULT_CHAT_CONFIG,
      chatEnabled: false,
    });
    const res = await POST(buildReq({ messages: "not-an-array" }));
    expect(res.status).toBe(503);
    expect(await res.text()).toBe("Assistant disabled");
    expect(mockReserveMessage).not.toHaveBeenCalled();
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  // -- 429 --
  it("returns 429 when rate limited; reserveMessage NOT called", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockCheckAndIncrement.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 1,
    });
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(429);
    expect(mockReserveMessage).not.toHaveBeenCalled();
  });

  // -- 403 quota --
  it("returns 403 {gate:'quota'} when reserveMessage fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockReserveMessage.mockResolvedValue({
      ok: false,
      remaining: 0,
      quota: 50,
    });
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { gate: string };
    expect(body.gate).toBe("quota");
    expect(mockReserveMessage).toHaveBeenCalledWith("u1");
    // The in-flight slot must be released too (else one quota rejection
    // converts into spurious 429s until the stale-slot expiry).
    expect(mockEndTurn).toHaveBeenCalledWith("u1");
  });

  // -- 403 quota gate must NOT refund (nothing was reserved) --
  it("does not call refundMessage when the quota gate rejects the reservation", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockReserveMessage.mockResolvedValue({
      ok: false,
      remaining: 0,
      quota: 50,
    });
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(403);
    expect(mockRefundMessage).not.toHaveBeenCalled();
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  // -- 400 x2 (malformed bodies must NOT burn a quota slot) --
  it("returns 400 on non-JSON body; reserveMessage NOT called", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
    expect(mockReserveMessage).not.toHaveBeenCalled();
  });

  it("returns 400 when messages is not an array; reserveMessage NOT called", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(buildReq({ messages: "nope" }));
    expect(res.status).toBe(400);
    expect(mockReserveMessage).not.toHaveBeenCalled();
  });

  it("400s >200 messages without touching quota", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const messages = Array.from({ length: 201 }, (_, i) => ({
      role: "user",
      content: `m${i}`,
    }));
    const res = await POST(buildReq({ messages }));
    expect(res.status).toBe(400);
    expect(mockReserveMessage).not.toHaveBeenCalled();
  });

  it("413s an oversized body without touching quota", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-length": String(600_000) },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      }),
    );
    expect(res.status).toBe(413);
    expect(mockReserveMessage).not.toHaveBeenCalled();
  });

  // -- 200 happy path --
  it("returns 200 on happy path, calls streamText, and onEnd invokes settleUsage", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });

    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.any(String) as string,
        messages: expect.any(Array) as unknown[],
        tools: expect.any(Object) as Record<string, unknown>,
        stopWhen: expect.any(Function) as () => boolean,
      }) as Record<string, unknown>,
    );

    // invoke the captured onEnd callback (settleUsage is async with mocked db)
    expect(capturedOnEnd).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/await-thenable -- onEnd returns void|Promise<void>
    await capturedOnEnd!({ usage: { inputTokens: 10, outputTokens: 5 } });

    expect(mockSettleUsage).toHaveBeenCalledWith("u1", {
      input: 10,
      output: 5,
      cachedInput: 0,
    });
    // a successful stream must never refund the reserved slot
    expect(mockRefundMessage).not.toHaveBeenCalled();
  });

  it("wires onStepFinish and emits a structured per-step usage log", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const logSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());
    try {
      const res = await POST(
        buildReq({ messages: [{ role: "user", content: "hi" }] }),
      );
      expect(res.status).toBe(200);
      // The structured usage log rides onStepFinish (the CHAT_LOG_USAGE=1
      // raw-usage probe inside onEnd stays untouched).
      expect(capturedOnStepFinish).not.toBeNull();
      // eslint-disable-next-line @typescript-eslint/await-thenable -- onStepFinish harness type is sync; the real hook may return a promise
      await capturedOnStepFinish!({
        usage: { inputTokens: 11, outputTokens: 6 },
      });
      expect(logSpy).toHaveBeenCalledWith(
        "[assistant:step-usage]",
        expect.stringContaining('"inputTokens":11'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        "[assistant:step-usage]",
        expect.stringContaining('"outputTokens":6'),
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  // -- 500 + refund (synchronous failure after reservation) --
  it("refunds the reserved slot and returns 500 when streamText throws", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation(() => {
      throw new Error("model unavailable");
    });

    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(500);
    expect(mockRefundMessage).toHaveBeenCalledWith("u1");
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  it("refunds the reserved slot and returns 500 when getModel throws", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetModel.mockRejectedValue(new Error("no LLM key configured"));

    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(500);
    expect(mockRefundMessage).toHaveBeenCalledWith("u1");
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  // -- async stream failure after the response started --
  it("refunds the reserved slot when the stream emits an error part", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation((() => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "error",
            error: new Error("upstream model failure"),
          });
          controller.close();
        },
      }),
    })) as unknown as typeof streamText);
    // consume the wrapped stream like createUIMessageStreamResponse would
    mockCreateUIMessageStreamResponse.mockImplementation((async ({
      stream,
    }: {
      stream: ReadableStream;
    }) => {
      const reader = stream.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
      return new Response("streamed", { status: 200 });
    }) as unknown as typeof createUIMessageStreamResponse);

    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);
    expect(mockRefundMessage).toHaveBeenCalledWith("u1");
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  it("does NOT refund when the client disconnects - the slot stays consumed (abort is not free)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation(
      () =>
        ({ stream: new ReadableStream({}) }) as unknown as ReturnType<
          typeof streamText
        >,
    );
    // simulate a client aborting mid-stream (cancels the response body)
    mockCreateUIMessageStreamResponse.mockImplementation((async ({
      stream,
    }: {
      stream: ReadableStream;
    }) => {
      const reader = stream.getReader();
      await reader.cancel();
      return new Response("cancelled", { status: 200 });
    }) as unknown as typeof createUIMessageStreamResponse);

    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);
    // Aborting must NOT refund - reading the answer then disconnecting
    // must not yield a free message or unrecorded usage.
    expect(mockRefundMessage).not.toHaveBeenCalled();
    // onEnd best-effort settlement may still run; no assertion on settleUsage here.
  });

  // -- settle/refund mutual exclusivity (shared quotaSettled flag) --
  it("settles (not refunds) when onEnd fires after a mid-stream error part - partial usage is recorded", async () => {
    // Scenario: a tool-loop step completes, then a LATER step errors
    // with a non-NoOutputGeneratedError. The SDK's eventProcessor.flush then
    // calls onEnd (settlement) even though the stream also carried an error
    // part. Settlement must win: partial token counts are recorded and the
    // slot is kept - the refund must NOT also fire.
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation(((opts: {
      onEnd?: (event: {
        usage: {
          inputTokens: number;
          outputTokens: number;
          inputTokenDetails?: { cacheReadTokens?: number };
        };
      }) => void;
    }) => {
      capturedOnEnd = opts.onEnd ?? null;
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: "error",
              error: new Error("upstream model failure"),
            });
            controller.close();
          },
        }),
      };
    }) as unknown as typeof streamText);
    mockCreateUIMessageStreamResponse.mockImplementation((async ({
      stream,
    }: {
      stream: ReadableStream;
    }) => {
      const reader = stream.getReader();
      // read the error part (the guard defers the refund - no settle yet)
      await reader.read();
      // the SDK's flush then settles the partial usage via onEnd
      expect(capturedOnEnd).not.toBeNull();
      // eslint-disable-next-line @typescript-eslint/await-thenable -- onEnd returns void|Promise<void>
      await capturedOnEnd!({ usage: { inputTokens: 10, outputTokens: 5 } });
      // drain to close: the guard must NOT refund because onEnd already settled
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
      return new Response("streamed", { status: 200 });
    }) as unknown as typeof createUIMessageStreamResponse);

    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);
    expect(mockSettleUsage).toHaveBeenCalledWith("u1", {
      input: 10,
      output: 5,
      cachedInput: 0,
    });
    expect(mockRefundMessage).not.toHaveBeenCalled();
  });

  it("does NOT refund when a mid-stream error is followed by a client cancel (abort wins, at-most-once)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation((() => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "error",
            error: new Error("upstream failure"),
          });
        },
      }),
    })) as unknown as typeof streamText);
    mockCreateUIMessageStreamResponse.mockImplementation((async ({
      stream,
    }: {
      stream: ReadableStream;
    }) => {
      const reader = stream.getReader();
      await reader.read(); // consume the error part (refund is deferred)
      await reader.cancel(); // client disconnects -> abort claims the turn, no refund
      return new Response("cancelled", { status: 200 });
    }) as unknown as typeof createUIMessageStreamResponse);

    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);
    // Cancel must not refund - even after an error part, the abort keeps the slot.
    expect(mockRefundMessage).not.toHaveBeenCalled();
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  // -- TASK 3 abort wiring --
  it("passes the request's abortSignal to streamText", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const req = buildReq({ messages: [{ role: "user", content: "hi" }] });
    await POST(req);
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal: req.signal }),
    );
  });

  // -- provider-native cache shape (Task 2) --
  it("settles cachedInput from a provider's raw prompt_cache_hit_tokens", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation(((opts: {
      onEnd?: (event: {
        usage: {
          inputTokens: number;
          outputTokens: number;
          inputTokenDetails?: { cacheReadTokens?: number };
          raw?: unknown;
        };
      }) => void;
    }) => {
      capturedOnEnd = opts.onEnd as typeof capturedOnEnd;
      void opts.onEnd?.({
        usage: {
          inputTokens: 1000,
          outputTokens: 100,
          raw: { prompt_cache_hit_tokens: 900 },
        },
      });
      return { stream: new ReadableStream() } as unknown as ReturnType<
        typeof streamText
      >;
    }) as unknown as typeof streamText);

    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);
    expect(mockSettleUsage).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ input: 1000, output: 100, cachedInput: 900 }),
    );
  });

  // -- canned answers stay quota-free (no reserve, no refund) --
  it("serves canned answers without reserving or refunding quota", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(
      buildReq({
        messages: [
          {
            role: "user",
            content: "What can you do?",
            parts: [{ type: "text", text: "What can you do?" }],
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(mockReserveMessage).not.toHaveBeenCalled();
    expect(mockRefundMessage).not.toHaveBeenCalled();
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  // -- TASK 6 phantom tool ref --
  it("system prompt names only real tools", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.not.stringContaining(
          "optimize-bid-allocation",
        ) as string,
      }),
    );
  });

  // -- TASK 7 reviews chaining --
  it("steers review requests to resolve the exact code then call get-course-reviews", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    await POST(
      buildReq({
        messages: [
          { role: "user", content: "reviews for computational thinking" },
        ],
      }),
    );
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringMatching(
          /resolve.*exact.*code.*then.*get-course-reviews/i,
        ) as string,
      }),
    );
  });

  // -- TASK 8 scope gate --
  it("gates the assistant to afterclass-only requests", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    await POST(
      buildReq({
        messages: [{ role: "user", content: "reverse a linked list" }],
      }),
    );
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringMatching(
          /SMU courses, bids, timetables, roadmaps, and reviews/,
        ) as string,
      }),
    );
  });

  // -- section bids go to the explorer, not the text estimator --
  it("steers section-specific bid questions to explore-bid-options with courseCode+section", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    await POST(
      buildReq({
        messages: [{ role: "user", content: "how much for COR-IS1702 G1?" }],
      }),
    );
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringMatching(
          /explore-bid-options.*courseCode\+section/i,
        ) as string,
      }),
    );
  });

  // -- long planning chains must leave a round for the closing summary --
  it("tells the model to stop calling tools and summarize before the round cap", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringMatching(
          /stop calling tools and summarize/i,
        ) as string,
      }),
    );
  });

  it("steers the model to render tool-provided page links", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining("Deep-links") as string,
      }),
    );
  });

  // -- page context (context-aware widget) --
  it("appends a page_context block for the current turn only", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(
      buildReq({
        messages: [
          { role: "user", content: "what do students say about this course?" },
        ],
        pageContext: {
          pathname: "/bidding/analytics",
          course: "IS215",
          section: "G1",
        },
      }),
    );
    expect(res.status).toBe(200);
    const instructions = mockStreamText.mock.calls[0]?.[0]
      ?.instructions as string;
    expect(instructions).toContain("<page_context>");
    expect(instructions).toContain("IS215");
    expect(instructions).toContain("G1");
    expect(instructions).toContain("/bidding/analytics");
  });

  it("keeps the SYSTEM_PROMPT head byte-identical with and without context", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    const plain = mockStreamText.mock.calls[0]?.[0]?.instructions as string;
    mockStreamText.mockClear();
    await POST(
      buildReq({
        messages: [{ role: "user", content: "hi" }],
        pageContext: { pathname: "/bidding/analytics", course: "IS215" },
      }),
    );
    const withCtx = mockStreamText.mock.calls[0]?.[0]?.instructions as string;
    expect(withCtx.startsWith(plain)).toBe(true);
    expect(withCtx.length).toBeGreaterThan(plain.length);
  });

  // -- 429 in-flight --
  it("returns 429 when a previous turn is still in flight; reserveMessage NOT called", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockBeginTurn.mockReturnValue(false);
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(429);
    expect(mockReserveMessage).not.toHaveBeenCalled();
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  // -- spike hard-block --
  it("skips settleUsage on a settlement spike (input over half maxInputTokens)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    // Restore the default capture-only streamText implementation: an earlier
    // test leaves one that fires onEnd during POST (claiming the turn, so an
    // explicit second onEnd call would hit the quotaSettled guard).
    mockStreamText.mockImplementation(((opts: {
      onEnd?: typeof capturedOnEnd;
    }) => {
      capturedOnEnd = opts.onEnd ?? null;
      return { stream: new ReadableStream() };
    }) as unknown as typeof streamText);
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);
    expect(capturedOnEnd).not.toBeNull();
    // DEFAULT_CHAT_CONFIG.maxInputTokens is 16000 → min(16000*0.5, 30000)=8000.
    // eslint-disable-next-line @typescript-eslint/await-thenable -- onEnd returns void|Promise<void>
    await capturedOnEnd!({ usage: { inputTokens: 9000, outputTokens: 5 } });
    expect(mockSettleUsage).not.toHaveBeenCalled();
    expect(mockEndTurn).toHaveBeenCalledWith("u1");
  });

  it("releases the in-flight turn when settlement succeeds", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    // Same capture-only reset as above (see spike test note).
    mockStreamText.mockImplementation(((opts: {
      onEnd?: typeof capturedOnEnd;
    }) => {
      capturedOnEnd = opts.onEnd ?? null;
      return { stream: new ReadableStream() };
    }) as unknown as typeof streamText);
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/await-thenable -- onEnd returns void|Promise<void>
    await capturedOnEnd!({ usage: { inputTokens: 10, outputTokens: 5 } });
    expect(mockSettleUsage).toHaveBeenCalled();
    expect(mockEndTurn).toHaveBeenCalledWith("u1");
  });

  // -- scope gate (cheap refusal before rate limit / quota) --
  it("refuses off-topic turns without touching the rate limiter, quota, or LLM", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(
      buildReq({
        messages: [
          {
            role: "user",
            content: "reverse a linked list",
            parts: [{ type: "text", text: "reverse a linked list" }],
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(mockCheckAndIncrement).not.toHaveBeenCalled();
    expect(mockReserveMessage).not.toHaveBeenCalled();
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  it("does not scope-refuse legacy content-only messages (fail-open to normal gates)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(
      buildReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(200);
    expect(mockStreamText).toHaveBeenCalled();
  });

  it("does not scope-refuse a pronoun follow-up to an in-scope turn", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    await POST(
      buildReq({
        messages: [
          {
            role: "user",
            content: "reviews about fang bingxu",
            parts: [{ type: "text", text: "reviews about fang bingxu" }],
          },
          {
            role: "assistant",
            content: "summary",
            parts: [{ type: "text", text: "summary" }],
          },
          {
            role: "user",
            content: "what did students say about him specifically",
            parts: [
              {
                type: "text",
                text: "what did students say about him specifically",
              },
            ],
          },
        ],
      }),
    );
    expect(mockStreamText).toHaveBeenCalled();
  });

  it("ignores invalid pageContext without failing the turn", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(
      buildReq({
        messages: [{ role: "user", content: "hi" }],
        pageContext: { pathname: "/x", evil: "1".repeat(99999), course: 42 },
      }),
    );
    expect(res.status).toBe(200);
    const instructions = mockStreamText.mock.calls[0]?.[0]
      ?.instructions as string;
    expect(instructions).not.toContain("evil");
    expect(instructions).not.toContain("<page_context>");
  });
});
