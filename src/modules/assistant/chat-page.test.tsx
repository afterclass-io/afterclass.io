// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
vi.mock("./chat-store", () => {
  const state = {
    activeSessionId: null,
    hydrated: true,
    sessions: [],
    hydrate: vi.fn(),
    setActive: vi.fn(),
  };
  const hook: ((sel: (s: typeof state) => unknown) => unknown) & {
    getState: () => unknown;
  } = Object.assign((sel: (s: typeof state) => unknown) => sel(state), {
    getState: () => ({ ...state, setActive: vi.fn() }),
  });
  return { useChatStore: hook };
});
vi.mock("@/common/tools/trpc/react", () => ({
  api: { useUtils: () => ({ invalidate: vi.fn() }) },
}));

import { ChatPage } from "./chat-page";

const status = (overrides: Partial<AssistantStatus> = {}): AssistantStatus => ({
  signedIn: true,
  quota: 50,
  used: 7,
  remaining: 43,
  spendPaused: false,
  hasConnectedAgent: false,
  nudgeAt: 40,
  aiDegraded: false,
  chatEnabled: true,
  widgetEnabled: true,
  aiConsented: true,
  ...overrides,
});

beforeEach(() => {
  mockUseChat.mockReset();
  mockSendMessage.mockReset();
  vi.unstubAllGlobals();
  mockUseChat.mockImplementation(() => ({
    messages: [],
    setMessages: vi.fn(),
    error: undefined,
    sendMessage: mockSendMessage,
    stop: vi.fn(),
    status: "ready",
  }));
});

describe("ChatPage consent gating", () => {
  it("renders the notice and no composer when unconsented (sidebar stays)", () => {
    render(<ChatPage initialStatus={status({ aiConsented: false })} />);
    expect(screen.getByText("Before you chat with AI")).toBeTruthy();
    expect(screen.queryByLabelText("Message input")).toBeNull();
  });

  it("renders the composer and no notice when consented", () => {
    render(<ChatPage initialStatus={status({ aiConsented: true })} />);
    expect(screen.getByLabelText("Message input")).toBeTruthy();
    expect(screen.queryByText("Before you chat with AI")).toBeNull();
  });

  it("Agree flips local state: notice → composer with no status refetch", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatPage initialStatus={status({ aiConsented: false })} />);
    fireEvent.click(screen.getByText("Agree and continue"));
    await waitFor(() =>
      expect(screen.getByLabelText("Message input")).toBeTruthy(),
    );
    expect(screen.queryByText("Before you chat with AI")).toBeNull();
    // Only the consent POST fired — no status refetch (bare minimum).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0] as unknown as
      [string, ...unknown[]] | undefined;
    expect(firstCall?.[0]).toBe("/api/assistant/consent");
  });

  it("mid-session consent-403 flips back to the notice", () => {
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
    render(<ChatPage initialStatus={status({ aiConsented: true })} />);
    expect(screen.getByLabelText("Message input")).toBeTruthy();
    act(() => {
      captured!(new Error('[POST /api/chat] 403: {"gate":"consent"}'));
    });
    expect(screen.getByText("Before you chat with AI")).toBeTruthy();
    expect(screen.queryByLabelText("Message input")).toBeNull();
  });
});
