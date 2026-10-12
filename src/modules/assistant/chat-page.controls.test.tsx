// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import type { ReactElement, ReactNode } from "react";
import type { Mock } from "vitest";
import type { AssistantStatus } from "@/server/assistant/status";

const { mockUseChat, mockSendMessage } = vi.hoisted(() => ({
  mockUseChat: vi.fn() as Mock,
  mockSendMessage: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({ useChat: mockUseChat }));
vi.mock("./use-persist-session", () => ({ usePersistSession: vi.fn() }));
vi.mock("./use-refresh-after-tools", () => ({
  useRefreshAfterTools: vi.fn(),
}));
vi.mock("@/common/tools/trpc/react", () => ({
  api: { useUtils: () => ({ invalidate: vi.fn() }) },
}));

import { hydratedAtom } from "./chat-store";
import { ChatPage } from "./chat-page";

const status = (overrides: Partial<AssistantStatus> = {}): AssistantStatus => ({
  signedIn: true,
  quota: 50,
  used: 7,
  remaining: 43,
  hasConnectedAgent: false,
  nudgeAt: 40,
  aiDegraded: false,
  chatEnabled: true,
  widgetEnabled: true,
  aiConsented: true,
  ...overrides,
});

const userMessage = {
  id: "user-1",
  role: "user",
  parts: [{ type: "text", text: "hi there" }],
};

// Mutable fake chat state: each render of the mocked useChat reads it, so a
// test changes status/messages/error then calls rerender.
let chatState: { messages: unknown[]; error: unknown; status: string };

let store: ReturnType<typeof createStore>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

const renderWithStore = (ui: ReactElement) => render(ui, { wrapper });

// The composer calls handleSendMessage with `void`, so a rejected send has no
// handler and Node reports it as unhandled. Swallow that for the refund test.
function swallowUnhandledRejections(): () => void {
  const onRejection = () => undefined;
  const previous = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", onRejection);
  return () => {
    process.removeListener("unhandledRejection", onRejection);
    for (const listener of previous) process.on("unhandledRejection", listener);
  };
}

const sendText = (text: string) => {
  fireEvent.change(screen.getByLabelText("Message input"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
};

beforeEach(() => {
  store = createStore();
  store.set(hydratedAtom, true);
  mockUseChat.mockReset();
  mockSendMessage.mockReset();
  vi.unstubAllGlobals();
  chatState = { messages: [], error: undefined, status: "ready" };
  mockUseChat.mockImplementation(() => ({
    setMessages: vi.fn(),
    stop: vi.fn(),
    sendMessage: mockSendMessage,
    ...chatState,
  }));
});

describe("ChatPage send quota", () => {
  let restoreRejections: () => void;
  beforeEach(() => {
    restoreRejections = swallowUnhandledRejections();
  });
  afterEach(() => {
    restoreRejections();
  });

  it("decrements the quota before sendMessage resolves", () => {
    mockSendMessage.mockReturnValue(new Promise(() => undefined));
    renderWithStore(<ChatPage initialStatus={status()} />);
    sendText("hello");
    expect(
      screen.getByText("42 of 50 free website messages left this month"),
    ).toBeTruthy();
    expect(mockSendMessage).toHaveBeenCalledWith({ text: "hello" });
  });

  it("refunds one message when sendMessage rejects", async () => {
    mockSendMessage.mockRejectedValue(new Error("403"));
    renderWithStore(<ChatPage initialStatus={status()} />);
    sendText("hello");
    expect(
      screen.getByText("42 of 50 free website messages left this month"),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByText("43 of 50 free website messages left this month"),
      ).toBeTruthy(),
    );
  });
});

describe("ChatPage status sync", () => {
  it("does not fetch status on mount when status is ready", () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithStore(<ChatPage initialStatus={status()} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches /api/assistant/status once when status goes streaming -> ready", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ remaining: 40 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    // Fresh element per rerender: React bails out on an identical element.
    const { rerender } = renderWithStore(<ChatPage initialStatus={status()} />);

    chatState.status = "streaming";
    rerender(<ChatPage initialStatus={status()} />);
    expect(fetchMock).not.toHaveBeenCalled();

    chatState.status = "ready";
    rerender(<ChatPage initialStatus={status()} />);
    await waitFor(() =>
      expect(
        screen.getByText("40 of 50 free website messages left this month"),
      ).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/assistant/status");

    // No further status change: no further fetch.
    rerender(<ChatPage initialStatus={status()} />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("ChatPage retry", () => {
  it("re-sends the last user text with its message id", () => {
    chatState = {
      messages: [userMessage],
      error: new Error("boom"),
      status: "ready",
    };
    renderWithStore(<ChatPage initialStatus={status()} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith({
      text: "hi there",
      messageId: "user-1",
    });
  });

  it("sends nothing when there is no user message", () => {
    chatState = { messages: [], error: new Error("boom"), status: "ready" };
    renderWithStore(<ChatPage initialStatus={status()} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
