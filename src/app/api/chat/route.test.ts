import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// ── vi.hoisted mocks (TDZ-safe) ──────────────────────────────────────────
const {
  mockAuth,
  mockCheckSpendGuard,
  mockReserveMessage,
  mockSettleUsage,
  mockRefundMessage,
  mockCheckAndIncrement,
  mockGetChatConfig,
  mockGetModel,
  mockBuildAssistantTools,
  mockTrimToBudget,
  mockCreateCallerForUser,
} = vi.hoisted(() => ({
  mockAuth: vi.fn() as Mock,
  mockCheckSpendGuard: vi.fn() as Mock,
  mockReserveMessage: vi.fn() as Mock,
  mockSettleUsage: vi.fn() as Mock,
  mockRefundMessage: vi.fn() as Mock,
  mockCheckAndIncrement: vi.fn() as Mock,
  mockGetChatConfig: vi.fn() as Mock,
  mockGetModel: vi.fn() as Mock,
  mockBuildAssistantTools: vi.fn() as Mock,
  mockTrimToBudget: vi.fn() as Mock,
  mockCreateCallerForUser: vi.fn() as Mock,
}));

// ── vi.mock calls ─────────────────────────────────────────────────────────
vi.mock("@/server/auth", () => ({ auth: mockAuth }));
vi.mock("@/server/assistant/quota", () => ({
  checkSpendGuard: mockCheckSpendGuard,
  reserveMessage: mockReserveMessage,
  settleUsage: mockSettleUsage,
  refundMessage: mockRefundMessage,
}));
vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: mockCheckAndIncrement,
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: mockGetChatConfig,
  getChatWriteRateLimit: (c: { rateLimitPerMinute: number }) => c.rateLimitPerMinute,
  getRateLimitWindowMinutes: () => 1,
}));
vi.mock("@/server/assistant/providers", () => ({
  getModel: mockGetModel,
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

vi.mock("ai", () => ({
  streamText: vi.fn().mockImplementation(
    (opts: {
      onEnd?: (event: {
        usage: { inputTokens: number; outputTokens: number; inputTokenDetails?: { cacheReadTokens?: number } };
      }) => void;
    }) => {
      capturedOnEnd = opts.onEnd ?? null;
      return { stream: new ReadableStream() };
    },
  ),
  createUIMessageStreamResponse: vi.fn().mockReturnValue(new Response("ok", { status: 200 })),
  toUIMessageStream: vi.fn().mockImplementation(({ stream }: { stream: ReadableStream }) => stream),
  createUIMessageStream: vi.fn().mockReturnValue({}),
  isStepCount: vi.fn(() => () => false),
}));

import { POST } from "@/app/api/chat/route";
import { createUIMessageStreamResponse, streamText } from "ai";

const mockStreamText = vi.mocked(streamText);
const mockCreateUIMessageStreamResponse = vi.mocked(createUIMessageStreamResponse);

const DEFAULT_CHAT_CONFIG = {
  quotaPerMonth: 50,
  nudgeAt: 40,
  rateLimitPerMinute: 10,
  mcpRateLimitPerMinute: 60,
  spendCapPerMonthUsd: 20,
  maxInputTokens: 16000,
  maxOutputTokens: 1024,
  maxToolRounds: 6,
  priceInputPerM: 0.14,
  priceCachedInputPerM: 0.014,
  priceOutputPerM: 0.28,
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
    mockAuth.mockReset();
    mockCheckSpendGuard.mockReset();
    mockReserveMessage.mockReset();
    mockSettleUsage.mockReset();
    mockRefundMessage.mockReset();
    mockCheckAndIncrement.mockReset();
    mockGetChatConfig.mockReset();
    mockGetModel.mockReset();
    mockBuildAssistantTools.mockReset();
    mockTrimToBudget.mockReset();
    mockCreateCallerForUser.mockReset();
    mockStreamText.mockClear();
    mockCreateUIMessageStreamResponse.mockReset();
    mockCreateUIMessageStreamResponse.mockReturnValue(new Response("ok", { status: 200 }));

    // defaults: everything passing
    mockGetChatConfig.mockResolvedValue(DEFAULT_CHAT_CONFIG);
    mockCheckSpendGuard.mockResolvedValue(true);
    mockReserveMessage.mockResolvedValue({ ok: true, remaining: 49, quota: 50 });
    mockRefundMessage.mockResolvedValue(undefined);
    mockCheckAndIncrement.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
    mockGetModel.mockResolvedValue("mock-model");
    mockBuildAssistantTools.mockReturnValue({});
    mockTrimToBudget.mockResolvedValue([]);
    mockCreateCallerForUser.mockReturnValue({});
  });

  // ── 401 ──
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(401);
  });

  // ── 429 ──
  it("returns 429 when rate limited; reserveMessage NOT called", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockCheckAndIncrement.mockResolvedValue({ ok: false, retryAfterSeconds: 1 });
    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(429);
    expect(mockReserveMessage).not.toHaveBeenCalled();
  });

  // ── 403 spend ──
  it("returns 403 {gate:'spend'} when spend guard tripped; reserveMessage NOT called", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockCheckSpendGuard.mockResolvedValue(false);
    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { gate: string };
    expect(body.gate).toBe("spend");
    expect(mockReserveMessage).not.toHaveBeenCalled();
  });

  // ── 403 quota ──
  it("returns 403 {gate:'quota'} when reserveMessage fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockReserveMessage.mockResolvedValue({ ok: false, remaining: 0, quota: 50 });
    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { gate: string };
    expect(body.gate).toBe("quota");
    expect(mockReserveMessage).toHaveBeenCalledWith("u1");
  });

  // ── 403 quota gate must NOT refund (nothing was reserved) ──
  it("does not call refundMessage when the quota gate rejects the reservation", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockReserveMessage.mockResolvedValue({ ok: false, remaining: 0, quota: 50 });
    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(403);
    expect(mockRefundMessage).not.toHaveBeenCalled();
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  // ── 400 x2 (malformed bodies must NOT burn a quota slot) ──
  it("returns 400 on non-JSON body; reserveMessage NOT called", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      body: "not json",
    }));
    expect(res.status).toBe(400);
    expect(mockReserveMessage).not.toHaveBeenCalled();
  });

  it("returns 400 when messages is not an array; reserveMessage NOT called", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(buildReq({ messages: "nope" }));
    expect(res.status).toBe(400);
    expect(mockReserveMessage).not.toHaveBeenCalled();
  });

  // ── 200 happy path ──
  it("returns 200 on happy path, calls streamText, and onEnd invokes settleUsage", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });

    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(200);

    // streamText should have been called
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

    // settleUsage should have been called with correct token counts (cachedInput defaults to 0)
    expect(mockSettleUsage).toHaveBeenCalledWith("u1", { input: 10, output: 5, cachedInput: 0 });
    // a successful stream must never refund the reserved slot
    expect(mockRefundMessage).not.toHaveBeenCalled();
  });

  // ── 500 + refund (synchronous failure after reservation) ──
  it("refunds the reserved slot and returns 500 when streamText throws", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation(() => {
      throw new Error("model unavailable");
    });

    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(500);
    expect(mockRefundMessage).toHaveBeenCalledWith("u1");
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  it("refunds the reserved slot and returns 500 when getModel throws", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetModel.mockRejectedValue(new Error("no LLM key configured"));

    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(500);
    expect(mockRefundMessage).toHaveBeenCalledWith("u1");
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  // ── async stream failure after the response started ──
  it("refunds the reserved slot when the stream emits an error part", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation(
      (() => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "error", error: new Error("upstream model failure") });
            controller.close();
          },
        }),
      })) as unknown as typeof streamText,
    );
    // consume the wrapped stream like createUIMessageStreamResponse would
    mockCreateUIMessageStreamResponse.mockImplementation(
      (async ({ stream }: { stream: ReadableStream }) => {
        const reader = stream.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
        return new Response("streamed", { status: 200 });
      }) as unknown as typeof createUIMessageStreamResponse,
    );

    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(200);
    expect(mockRefundMessage).toHaveBeenCalledWith("u1");
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  it("does NOT refund when the client disconnects — the slot stays consumed (abort is not free)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation(
      () => ({ stream: new ReadableStream({}) }) as unknown as ReturnType<typeof streamText>,
    );
    // simulate a client aborting mid-stream (cancels the response body)
    mockCreateUIMessageStreamResponse.mockImplementation(
      (async ({ stream }: { stream: ReadableStream }) => {
        const reader = stream.getReader();
        await reader.cancel();
        return new Response("cancelled", { status: 200 });
      }) as unknown as typeof createUIMessageStreamResponse,
    );

    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(200);
    // Security fix H1: abort must NOT refund — reading the answer then disconnecting
    // must not yield a free message or unrecorded spend.
    expect(mockRefundMessage).not.toHaveBeenCalled();
    // onEnd best-effort settlement may still run; no assertion on settleUsage here.
  });

  // ── settle/refund mutual exclusivity (shared quotaSettled flag) ──
  it("settles (not refunds) when onEnd fires after a mid-stream error part — partial usage is recorded", async () => {
    // Reviewer scenario: a tool-loop step completes, then a LATER step errors
    // with a non-NoOutputGeneratedError. The SDK's eventProcessor.flush then
    // calls onEnd (settlement) even though the stream also carried an error
    // part. Settlement must win: partial spend is recorded and the slot is
    // kept — the refund must NOT also fire.
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation(
      ((opts: {
        onEnd?: (event: {
          usage: { inputTokens: number; outputTokens: number; inputTokenDetails?: { cacheReadTokens?: number } };
        }) => void;
      }) => {
        capturedOnEnd = opts.onEnd ?? null;
        return {
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "error", error: new Error("upstream model failure") });
              controller.close();
            },
          }),
        };
      }) as unknown as typeof streamText,
    );
    mockCreateUIMessageStreamResponse.mockImplementation(
      (async ({ stream }: { stream: ReadableStream }) => {
        const reader = stream.getReader();
        // read the error part (the guard defers the refund — no settle yet)
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
      }) as unknown as typeof createUIMessageStreamResponse,
    );

    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(200);
    expect(mockSettleUsage).toHaveBeenCalledWith("u1", { input: 10, output: 5, cachedInput: 0 });
    expect(mockRefundMessage).not.toHaveBeenCalled();
  });

  it("does NOT refund when a mid-stream error is followed by a client cancel (abort wins, at-most-once)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockStreamText.mockImplementation(
      (() => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "error", error: new Error("upstream failure") });
          },
        }),
      })) as unknown as typeof streamText,
    );
    mockCreateUIMessageStreamResponse.mockImplementation(
      (async ({ stream }: { stream: ReadableStream }) => {
        const reader = stream.getReader();
        await reader.read(); // consume the error part (refund is deferred)
        await reader.cancel(); // client disconnects -> abort claims the turn, no refund
        return new Response("cancelled", { status: 200 });
      }) as unknown as typeof createUIMessageStreamResponse,
    );

    const res = await POST(buildReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(200);
    // H1: cancel must not refund — even after an error part, the abort keeps the slot.
    expect(mockRefundMessage).not.toHaveBeenCalled();
    expect(mockSettleUsage).not.toHaveBeenCalled();
  });

  // ── canned answers stay quota-free (no reserve, no refund) ──
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
});
