"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import type { AssistantStatus } from "@/server/assistant/status";
import { MessageList } from "@/modules/assistant/message-list";
import { AssistantErrorMessage, shouldShowChatError } from "@/modules/assistant/error-message";
import { Composer } from "@/modules/assistant/composer";
import { WelcomeSuggestions, FollowUpSuggestions } from "@/modules/assistant/suggestions";
import { ConnectGate } from "@/modules/assistant/connect-gate";
import { usePersistSession } from "@/modules/assistant/use-persist-session";
import { useRefreshAfterTools } from "@/modules/assistant/use-refresh-after-tools";
import { useChatStore } from "@/modules/assistant/chat-store";
import { SessionList } from "@/modules/assistant/session-list";
import { QuotaMeter } from "@/modules/assistant/quota-meter/quota-meter";
import { QuotaAlertBar } from "@/modules/assistant/quota-alert-bar";
import { McpRecommendation } from "@/modules/assistant/mcp-recommendation";
import { parseGateError, type ChatGate } from "@/modules/assistant/gate";

export function ChatPage({ initialStatus }: { initialStatus: AssistantStatus }) {
  const [status] = useState(initialStatus);
  const [gate, setGate] = useState<ChatGate | null>(null);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const hydrated = useChatStore((s) => s.hydrated);
  const hydrate = useChatStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  const chat = useChat({
    transport,
    throttle: 32,
    onError: (error) => {
      const g = parseGateError(error);
      if (g) setGate(g);
    },
  });

  usePersistSession({ status: chat.status, messages: chat.messages });
  useRefreshAfterTools(chat.status);

  // Resume the highlighted active session once, right after hydrate. Without
  // this, /assistant mounts an EMPTY thread while the sidebar highlights the
  // active session (e.g. one just created by the widget), so the next message
  // would silently overwrite a saved thread. Guard: only on hydrate and only
  // while the thread is still empty - never clobber a fresh thread.
  useEffect(() => {
    if (!hydrated) return;
    const { activeSessionId, sessions } = useChatStore.getState();
    if (!activeSessionId) return;
    const session = sessions.find((s) => s.id === activeSessionId);
    if (session && session.messages.length > 0 && chat.messages.length === 0) {
      chat.setMessages(session.messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const openSession = useCallback(
    async (id: string) => {
      const session = useChatStore.getState().sessions.find((s) => s.id === id);
      if (!session) return;
      useChatStore.getState().setActive(id);
      chat.setMessages(session.messages);
      setGate(null);
    },
    [chat],
  );

  const newChat = useCallback(() => {
    useChatStore.getState().setActive(null);
    chat.setMessages([]);
    setGate(null);
  }, [chat]);

  const hasMessages = chat.messages.length > 0;
  const isRunning = chat.status === "streaming" || chat.status === "submitted";

  // chat.error is a single global state that only reflects the LAST request;
  // a new send clears it, so the bubble naturally maps to the current failed
  // turn. Gate errors (quota/spend) render the ConnectGate surface instead.
  const showError = shouldShowChatError(chat.error);

  const retry = useCallback(() => {
    const lastUser = [...chat.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const text = lastUser.parts
      .filter((p) => p.type === "text")
      .map((p) => ("text" in p ? p.text : ""))
      .join("");
    if (!text) return;
    // Re-send the failed message in place (messageId replaces it) - no duplicate.
    void chat.sendMessage({ text, messageId: lastUser.id });
  }, [chat]);

  return (
    // Vertical chrome above the chat (see CoreLayoutHeader h-16 + (school)/layout
    // margins/padding): 5.5rem on mobile, 7rem on desktop. This keeps the composer
    // above the fold at 100% zoom. Update if the header/layout heights change.
    <div className="mx-auto flex h-[calc(100dvh-5.5rem)] max-w-6xl gap-4 md:h-[calc(100dvh-7rem)]">
      <aside className="border-border/60 dark:border-muted-foreground/15 flex w-72 shrink-0 flex-col gap-3 rounded-xl border p-3">
        <McpRecommendation hasConnectedAgent={status.hasConnectedAgent} onDismiss={() => undefined} />
        <QuotaMeter
          remaining={status.remaining}
          quota={status.quota}
          nudgeAt={status.nudgeAt}
          hasConnectedAgent={status.hasConnectedAgent}
        />
        <SessionList activeSessionId={activeSessionId} onSelect={openSession} onNew={newChat} />
      </aside>
      <main className="border-border/60 dark:border-muted-foreground/15 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border">
        {gate ? (
          <div className="flex h-full items-center justify-center">
            <ConnectGate reason={gate} />
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!hasMessages ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
                  <h1 className="text-2xl font-semibold">How can I help you today?</h1>
                  <WelcomeSuggestions onPick={(prompt) => chat.sendMessage({ text: prompt })} />
                </div>
              ) : (
                <MessageList messages={chat.messages} />
              )}
              {showError && <AssistantErrorMessage error={chat.error} onRetry={retry} />}
            </div>
            <FollowUpSuggestions
              onPick={(prompt) => chat.sendMessage({ text: prompt })}
              messages={chat.messages}
              isRunning={isRunning}
              lastTurnFailed={showError}
            />
            <QuotaAlertBar
              remaining={status.remaining}
              quota={status.quota}
              hasConnectedAgent={status.hasConnectedAgent}
            />
            <Composer sendMessage={chat.sendMessage} status={chat.status} stop={chat.stop} />
          </>
        )}
      </main>
    </div>
  );
}
