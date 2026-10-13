// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChatControls } from "./use-chat-controls";

type Chat = Parameters<typeof useChatControls>[0]["chat"];

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    messages: [],
    status: "ready",
    error: undefined,
    sendMessage: vi.fn(async () => undefined),
    ...overrides,
  };
}

const userMessage = {
  id: "user-1",
  role: "user" as const,
  parts: [{ type: "text" as const, text: "hi there" }],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useChatControls derived flags", () => {
  it("isRunning is true only while submitted or streaming", () => {
    const { result, rerender } = renderHook(
      ({ chat }) =>
        useChatControls({ chat, initialRemaining: 5, scrollToBottom: vi.fn() }),
      { initialProps: { chat: makeChat({ status: "streaming" }) } },
    );
    expect(result.current.isRunning).toBe(true);
    rerender({ chat: makeChat({ status: "submitted" }) });
    expect(result.current.isRunning).toBe(true);
    rerender({ chat: makeChat({ status: "ready" }) });
    expect(result.current.isRunning).toBe(false);
    rerender({ chat: makeChat({ status: "error" }) });
    expect(result.current.isRunning).toBe(false);
  });

  it("showError is true for a plain error and false for a gate error", () => {
    const plain = renderHook(() =>
      useChatControls({
        chat: makeChat({ error: new Error("boom") }),
        initialRemaining: 5,
        scrollToBottom: vi.fn(),
      }),
    );
    expect(plain.result.current.showError).toBe(true);

    const gate = renderHook(() =>
      useChatControls({
        chat: makeChat({
          error: new Error('[POST /api/chat] 403: {"gate":"quota"}'),
        }),
        initialRemaining: 5,
        scrollToBottom: vi.fn(),
      }),
    );
    expect(gate.result.current.showError).toBe(false);
  });
});

describe("useChatControls send wrapper", () => {
  it("keeps the decrement when sendMessage resolves", async () => {
    const scrollToBottom = vi.fn();
    const { result } = renderHook(() =>
      useChatControls({
        chat: makeChat(),
        initialRemaining: 5,
        scrollToBottom,
      }),
    );
    await act(async () => {
      await result.current.handleSendMessage({ text: "hello" });
    });
    expect(result.current.optimisticRemaining).toBe(4);
    expect(scrollToBottom).toHaveBeenCalledWith("smooth");
  });

  it("refunds one message and rethrows when sendMessage rejects", async () => {
    const failure = new Error("403");
    const sendMessage = vi.fn(async () => {
      throw failure;
    });
    const { result } = renderHook(() =>
      useChatControls({
        chat: makeChat({ sendMessage }),
        initialRemaining: 5,
        scrollToBottom: vi.fn(),
      }),
    );
    let caught: unknown;
    await act(async () => {
      await result.current
        .handleSendMessage({ text: "hello" })
        .catch((e: unknown) => {
          caught = e;
        });
    });
    expect(caught).toBe(failure);
    expect(result.current.optimisticRemaining).toBe(5);
  });
});

describe("useChatControls status sync", () => {
  it("fetches once after running -> ready, never on mount, and applies the fresh count", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ remaining: 3, quota: 9 }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onStatusSynced = vi.fn();
    const { result, rerender } = renderHook(
      ({ chat }) =>
        useChatControls({
          chat,
          initialRemaining: 5,
          scrollToBottom: vi.fn(),
          onStatusSynced,
        }),
      { initialProps: { chat: makeChat({ status: "ready" }) } },
    );
    expect(fetchMock).not.toHaveBeenCalled();

    rerender({ chat: makeChat({ status: "streaming" }) });
    expect(fetchMock).not.toHaveBeenCalled();

    rerender({ chat: makeChat({ status: "ready" }) });
    await waitFor(() => expect(result.current.optimisticRemaining).toBe(3));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/assistant/status");
    expect(onStatusSynced).toHaveBeenCalledWith({ remaining: 3, quota: 9 });
  });
});

describe("useChatControls retry", () => {
  it("re-sends the last user text with its message id", () => {
    const sendMessage = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useChatControls({
        chat: makeChat({
          messages: [userMessage],
          error: new Error("boom"),
          sendMessage,
        }),
        initialRemaining: 5,
        scrollToBottom: vi.fn(),
      }),
    );
    act(() => {
      result.current.retry();
    });
    expect(sendMessage).toHaveBeenCalledWith({
      text: "hi there",
      messageId: "user-1",
    });
  });
});
