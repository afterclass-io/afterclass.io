// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";

vi.mock("./idb", () => ({
  idbGetAll: vi.fn(async () => []),
  idbPut: vi.fn(async () => undefined),
  idbDelete: vi.fn(async () => undefined),
}));

import { useChatStore } from "./chat-store";
import { usePersistSession } from "./use-persist-session";

const msg = (role: "user" | "assistant", text: string, id: string): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

function renderPersist(keepOwnSession: boolean) {
  type Props = { status: "submitted" | "streaming" | "ready" | "error"; messages: UIMessage[] };
  return renderHook<void, Props>(
    ({ status, messages }) => usePersistSession({ status, messages, keepOwnSession }),
    { initialProps: { status: "ready", messages: [] } },
  );
}

beforeEach(() => {
  useChatStore.setState({ hydrated: false, sessions: [], activeSessionId: null });
});

describe("usePersistSession - widget session reuse (Task 4)", () => {
  it("reuses its OWN session across consecutive run-ends instead of creating one per run", async () => {
    const { rerender } = renderPersist(true);

    // Run 1: submitted -> ready persists the first thread and creates one session.
    act(() => rerender({ status: "submitted", messages: [msg("user", "q1", "u1")] }));
    act(() => rerender({ status: "ready", messages: [msg("user", "q1", "u1"), msg("assistant", "a1", "a1")] }));
    await waitFor(() => expect(useChatStore.getState().sessions).toHaveLength(1));
    const firstId = useChatStore.getState().sessions[0]!.id;

    // Run 2: a second run-end on the SAME mount must NOT create a second session.
    act(() =>
      rerender({
        status: "submitted",
        messages: [msg("user", "q1", "u1"), msg("assistant", "a1", "a1"), msg("user", "q2", "u2")],
      }),
    );
    act(() =>
      rerender({
        status: "ready",
        messages: [
          msg("user", "q1", "u1"),
          msg("assistant", "a1", "a1"),
          msg("user", "q2", "u2"),
          msg("assistant", "a2", "a2"),
        ],
      }),
    );

    await waitFor(() => {
      const s = useChatStore.getState();
      expect(s.sessions).toHaveLength(1);
      expect(s.sessions[0]!.id).toBe(firstId);
    });
    expect(useChatStore.getState().sessions[0]!.messages).toHaveLength(4);
  });

  it("never writes to the shared active session (clobber fix preserved)", async () => {
    const sharedThread = msg("user", "saved /assistant thread message", "s1");
    useChatStore.setState({
      hydrated: true,
      sessions: [
        { id: "shared-1", title: "Existing /assistant thread", updatedAt: "2026-01-01T00:00:00.000Z", messages: [sharedThread] },
      ],
      activeSessionId: "shared-1",
    });

    const { rerender } = renderPersist(true);
    act(() => rerender({ status: "submitted", messages: [msg("user", "widget question", "w1")] }));
    act(() =>
      rerender({ status: "ready", messages: [msg("user", "widget question", "w1"), msg("assistant", "widget answer", "wa1")] }),
    );

    await waitFor(() => {
      const s = useChatStore.getState();
      // The shared thread is untouched, plus exactly ONE new widget session.
      const shared = s.sessions.find((x) => x.id === "shared-1");
      expect(shared).toBeDefined();
      expect(shared!.messages).toEqual([sharedThread]);
      expect(s.sessions).toHaveLength(2);
    });

    const widgetSession = useChatStore.getState().sessions.find((x) => x.id !== "shared-1");
    expect(widgetSession).toBeDefined();
    expect(widgetSession!.messages).toHaveLength(2);
    expect(useChatStore.getState().activeSessionId).toBe(widgetSession!.id);
  });

  it("page keeps default reuse - saves into the shared active session without creating a new one", async () => {
    useChatStore.setState({
      hydrated: true,
      sessions: [
        { id: "shared-1", title: "Thread", updatedAt: "2026-01-01T00:00:00.000Z", messages: [msg("user", "first", "u0")] },
      ],
      activeSessionId: "shared-1",
    });

    const { rerender } = renderPersist(false);
    act(() => rerender({ status: "submitted", messages: [msg("user", "first", "u0"), msg("user", "second", "u1")] }));
    act(() =>
      rerender({
        status: "ready",
        messages: [msg("user", "first", "u0"), msg("user", "second", "u1"), msg("assistant", "answer", "a1")],
      }),
    );

    await waitFor(() => expect(useChatStore.getState().sessions).toHaveLength(1));
    const s = useChatStore.getState();
    expect(s.sessions[0]!.id).toBe("shared-1");
    expect(s.sessions[0]!.messages).toHaveLength(3);
  });

  it("widget creates a session on first run-end even when the shared active session is null", async () => {
    const { rerender } = renderPersist(true);
    act(() => rerender({ status: "submitted", messages: [msg("user", "q", "u1")] }));
    act(() => rerender({ status: "ready", messages: [msg("user", "q", "u1"), msg("assistant", "a", "a1")] }));
    await waitFor(() => expect(useChatStore.getState().sessions).toHaveLength(1));
    expect(useChatStore.getState().activeSessionId).not.toBeNull();
  });
});
