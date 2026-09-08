import React, { useEffect } from "react";
import type { Decorator } from "@storybook/react";
import {
  useChatStore,
  type StoredSession,
} from "@/modules/assistant/chat-store";
import { __setChatState, type ChatStateParam } from "./mocks/ai-sdk-react";
import type { AssistantStatus } from "@/server/assistant/status";

const NO_SESSIONS: StoredSession[] = [];

export const seedAssistantStore = (
  sessions: StoredSession[] = [],
  activeSessionId: string | null = null,
) => {
  useChatStore.setState({ hydrated: true, sessions, activeSessionId });
};

type AssistantParameters = {
  sessions?: StoredSession[];
  activeSessionId?: string | null;
  status?: AssistantStatus | null;
};

export const mockAssistantStatus = (status: AssistantStatus | null) => {
  // Snapshot the live fetch: a forwarding closure would self-recurse after
  // cleanup restores it (closure -> window.fetch -> closure ...).
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (
    ...args: Parameters<typeof window.fetch>
  ): Promise<Response> => {
    const [input] = args;
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes("/api/assistant/status")) {
      return new Response(JSON.stringify(status), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(...args);
  };
};

function WithAssistantEffects({
  sessions,
  activeSessionId,
  status,
}: {
  sessions: StoredSession[];
  activeSessionId: string | null;
  status: AssistantStatus | null | undefined;
}) {
  useEffect(() => {
    // See mockAssistantStatus: snapshot, never a forwarding closure.
    const originalFetch = window.fetch.bind(window);
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

  return null;
}

export const withAssistant: Decorator = (Story, context) => {
  const {
    sessions = NO_SESSIONS,
    activeSessionId = null,
    status = undefined,
  } = (context.parameters.assistant ?? {}) as AssistantParameters;

  // Hand the story's chatState to the ai-sdk-react mock before the story
  // renders. Runs on every decorator re-render, so the mock always sees the
  // current story's value; stories without chatState reset it to undefined
  // (real useChat fall-through).
  const chatState = context.parameters.chatState as ChatStateParam | undefined;
  __setChatState(chatState);

  return (
    <>
      <WithAssistantEffects
        sessions={sessions}
        activeSessionId={activeSessionId}
        status={status}
      />
      <Story />
    </>
  );
};
