import React, { useEffect } from "react";
import type { Decorator } from "@storybook/react";
import { useChatStore, type StoredSession } from "@/modules/assistant/chat-store";
import { __setChatState } from "./mocks/ai-sdk-react";
import type { AssistantStatus } from "@/server/assistant/status";

const NO_SESSIONS: StoredSession[] = [];

export const seedAssistantStore = (
  sessions: StoredSession[] = [],
  activeSessionId: string | null = null,
) => {
  useChatStore.setState({ hydrated: true, sessions, activeSessionId });
};

export const mockAssistantStatus = (status: AssistantStatus | null) => {
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes("/api/assistant/status")) {
      return Promise.resolve(new Response(JSON.stringify(status), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }
    return originalFetch(input, init);
  };
};

export const withAssistant: Decorator = (Story, context) => {
  const {
    sessions = NO_SESSIONS,
    activeSessionId = null,
    status = undefined,
  } = (context.parameters.assistant ?? {}) as {
    sessions?: StoredSession[];
    activeSessionId?: string | null;
    status?: AssistantStatus | null;
  };

  // Hand the story's chatState to the ai-sdk-react mock before the story
  // renders. Runs on every decorator re-render, so the mock always sees the
  // current story's value; stories without chatState reset it to undefined
  // (real useChat fall-through).
  const chatState = context.parameters.chatState;
  __setChatState(chatState);

  useEffect(() => {
    const originalFetch = window.fetch;
    seedAssistantStore(sessions, activeSessionId);
    if (status !== undefined) mockAssistantStatus(status);
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // storage unavailable - non-fatal
    }
    return () => {
      window.fetch = originalFetch;
    };
  }, [sessions, activeSessionId, status]);

  return <Story />;
};
