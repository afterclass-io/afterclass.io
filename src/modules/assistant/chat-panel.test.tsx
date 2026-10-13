// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import type { ReactElement, ReactNode } from "react";
import type { Mock } from "vitest";

const { mockUseChat, mockSendMessage } = vi.hoisted(() => ({
  mockUseChat: vi.fn() as Mock,
  mockSendMessage: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({ useChat: mockUseChat }));
vi.mock("./use-page-context", () => ({ usePageContext: () => null }));
vi.mock("./use-persist-session", () => ({ usePersistSession: vi.fn() }));
import { hydratedAtom } from "./chat-store";
import { ChatPanel } from "./chat-panel";

const baseProps = {
  quota: 50,
  remaining: 43,
  hasConnectedAgent: false,
  aiDegraded: false,
  onGate: vi.fn(),
  aiConsented: true,
  onConsented: vi.fn(),
  onConsentRevoked: vi.fn(),
};

function mockChatState(overrides: Record<string, unknown> = {}) {
  mockUseChat.mockImplementation(() => {
    return {
      messages: [],
      setMessages: vi.fn(),
      error: undefined,
      sendMessage: mockSendMessage,
      stop: vi.fn(),
      status: "ready",
      ...overrides,
    };
  });
}

// Hydrated store: hydrate() returns early, so no test touches IndexedDB.
let store: ReturnType<typeof createStore>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

const renderWithStore = (ui: ReactElement) => render(ui, { wrapper });

beforeEach(() => {
  store = createStore();
  store.set(hydratedAtom, true);
  mockUseChat.mockReset();
  mockSendMessage.mockReset();
  vi.unstubAllGlobals();
  mockChatState();
});

describe("ChatPanel consent gating", () => {
  it("renders the notice and no composer when unconsented", () => {
    renderWithStore(<ChatPanel {...baseProps} aiConsented={false} />);
    expect(screen.getByText("Before you chat with AI")).toBeTruthy();
    expect(screen.queryByLabelText("Message input")).toBeNull();
  });

  it("renders the composer and no notice when consented", () => {
    renderWithStore(<ChatPanel {...baseProps} aiConsented />);
    expect(screen.getByLabelText("Message input")).toBeTruthy();
    expect(screen.queryByText("Before you chat with AI")).toBeNull();
  });

  it("onConsented flips the parent from notice to composer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const { rerender } = renderWithStore(
      <ChatPanel {...baseProps} aiConsented={false} onConsented={vi.fn()} />,
    );
    expect(screen.getByText("Before you chat with AI")).toBeTruthy();
    fireEvent.click(screen.getByText("Agree and continue"));
    await waitFor(() =>
      expect(screen.queryByText("Before you chat with AI")).toBeTruthy(),
    );
    // Parent flips local state true on onConsented (wired in provider/page).
    rerender(<ChatPanel {...baseProps} aiConsented />);
    expect(screen.getByLabelText("Message input")).toBeTruthy();
    expect(screen.queryByText("Before you chat with AI")).toBeNull();
  });

  it("mid-session consent-403 calls onConsentRevoked, not onGate", () => {
    const onGate = vi.fn();
    const onConsentRevoked = vi.fn();
    let captured: ((e: Error) => void) | undefined;
    mockUseChat.mockImplementation(
      (opts?: { onError?: (e: Error) => void }) => {
        captured = opts?.onError;
        return {
          messages: [],
          setMessages: vi.fn(),
          error: undefined,
          sendMessage: mockSendMessage,
          stop: vi.fn(),
          status: "ready",
        };
      },
    );
    renderWithStore(
      <ChatPanel
        {...baseProps}
        onGate={onGate}
        onConsentRevoked={onConsentRevoked}
      />,
    );
    captured!(new Error('[POST /api/chat] 403: {"gate":"consent"}'));
    expect(onConsentRevoked).toHaveBeenCalledTimes(1);
    expect(onGate).not.toHaveBeenCalled();
  });

  it("quota gate still routes to onGate", () => {
    const onGate = vi.fn();
    const onConsentRevoked = vi.fn();
    let captured: ((e: Error) => void) | undefined;
    mockUseChat.mockImplementation(
      (opts?: { onError?: (e: Error) => void }) => {
        captured = opts?.onError;
        return {
          messages: [],
          setMessages: vi.fn(),
          error: undefined,
          sendMessage: mockSendMessage,
          stop: vi.fn(),
          status: "ready",
        };
      },
    );
    renderWithStore(
      <ChatPanel
        {...baseProps}
        onGate={onGate}
        onConsentRevoked={onConsentRevoked}
      />,
    );
    captured!(new Error('[POST /api/chat] 403: {"gate":"quota"}'));
    expect(onGate).toHaveBeenCalledWith("quota");
    expect(onConsentRevoked).not.toHaveBeenCalled();
  });
});

describe("ChatPanel optimistic quota", () => {
  it("optimistically decrements the remaining count passed to QuotaAlertBar on send", async () => {
    // remaining=18/20 sits in the warn band (pct 90→85 would show no bar at
    // 43/50, so use values where the bar is visible and its message shifts).
    mockSendMessage.mockResolvedValue(undefined);
    const props = { ...baseProps, quota: 20, remaining: 10 };
    renderWithStore(<ChatPanel {...props} />);
    expect(
      screen.getByText(/You've used 50% of your free messages/),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Message input"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByLabelText("Send message"));
    expect(
      await screen.findByText(/You've used 55% of your free messages/),
    ).toBeTruthy();
    expect(mockSendMessage).toHaveBeenCalledWith({ text: "hello" });
  });
});

describe("ChatPanel scroll to bottom", () => {
  const userMsg = (id: string) => ({
    id,
    role: "user" as const,
    parts: [{ type: "text" as const, text: "hello" }],
  });

  function scrollContainer() {
    const el = document.querySelector("[data-testid='chat-scroll-container']");
    if (!(el instanceof HTMLElement))
      throw new Error("missing chat scroll container");
    return el;
  }

  function setScrollable(el: HTMLElement) {
    Object.defineProperty(el, "scrollHeight", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(el, "clientHeight", {
      value: 400,
      configurable: true,
    });
    el.scrollTop = 600;
  }

  function scrollUp(el: HTMLElement) {
    setScrollable(el);
    el.scrollTop = 0;
    fireEvent.scroll(el);
  }

  it("shows no scroll button when there are no messages", () => {
    mockChatState({ messages: [] });
    renderWithStore(<ChatPanel {...baseProps} />);
    expect(screen.queryByLabelText("Scroll to bottom")).toBeNull();
  });

  it("shows no scroll button while pinned at the bottom", () => {
    mockChatState({ messages: [userMsg("u1"), userMsg("u2")] });
    renderWithStore(<ChatPanel {...baseProps} />);
    expect(screen.queryByLabelText("Scroll to bottom")).toBeNull();
  });

  it("shows the scroll button after scrolling up, and clicking it returns to bottom", () => {
    mockChatState({ messages: [userMsg("u1"), userMsg("u2")] });
    renderWithStore(<ChatPanel {...baseProps} />);
    const el = scrollContainer();
    scrollUp(el);
    const button = screen.getByLabelText("Scroll to bottom");
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(screen.queryByLabelText("Scroll to bottom")).toBeNull();
  });
});
