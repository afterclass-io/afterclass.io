// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { mockUseChat, mockSendMessage } = vi.hoisted(() => ({
  mockUseChat: vi.fn() as Mock,
  mockSendMessage: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({ useChat: mockUseChat }));
vi.mock("./use-page-context", () => ({ usePageContext: () => null }));
vi.mock("./use-persist-session", () => ({ usePersistSession: vi.fn() }));
vi.mock("./chat-store", () => ({
  useChatStore: Object.assign(
    vi.fn(() => vi.fn()),
    {
      getState: () => ({}),
    },
  ),
}));

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

beforeEach(() => {
  mockUseChat.mockReset();
  mockSendMessage.mockReset();
  vi.unstubAllGlobals();
  mockChatState();
});

describe("ChatPanel consent gating", () => {
  it("renders the notice and no composer when unconsented", () => {
    render(<ChatPanel {...baseProps} aiConsented={false} />);
    expect(screen.getByText("Before you chat with AI")).toBeTruthy();
    expect(screen.queryByLabelText("Message input")).toBeNull();
  });

  it("renders the composer and no notice when consented", () => {
    render(<ChatPanel {...baseProps} aiConsented />);
    expect(screen.getByLabelText("Message input")).toBeTruthy();
    expect(screen.queryByText("Before you chat with AI")).toBeNull();
  });

  it("onConsented flips the parent from notice to composer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const { rerender } = render(
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
    render(
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
    render(
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
