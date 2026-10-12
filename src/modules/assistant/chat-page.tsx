"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChevronDownIcon } from "lucide-react";
import { useAtomValue, useSetAtom, useStore } from "jotai";

import type { AssistantStatus } from "@/server/assistant/status";
import { MessageList } from "@/modules/assistant/message-list";
import { TypingIndicator } from "@/modules/assistant/typing-indicator";
import { AssistantErrorMessage } from "@/modules/assistant/error-message";
import { Composer } from "@/modules/assistant/composer";
import { ConsentNotice } from "@/modules/assistant/consent-notice";
import {
  WelcomeSuggestions,
  FollowUpSuggestions,
} from "@/modules/assistant/suggestions";
import { ConnectGate } from "@/modules/assistant/connect-gate";
import { usePersistSession } from "@/modules/assistant/use-persist-session";
import { useRefreshAfterTools } from "@/modules/assistant/use-refresh-after-tools";
import {
  activeSessionIdAtom,
  hydrateAtom,
  hydratedAtom,
  sessionsAtom,
} from "@/modules/assistant/chat-store";
import { useChatScroll } from "@/modules/assistant/use-chat-scroll";
import { useChatControls } from "@/modules/assistant/use-chat-controls";
import { SessionList } from "@/modules/assistant/session-list";
import { QuotaMeter } from "@/modules/assistant/quota-meter/quota-meter";
import { QuotaAlertBar } from "@/modules/assistant/quota-alert-bar";
import { McpRecommendation } from "@/modules/assistant/mcp-recommendation";
import { parseGateError, type ChatGate } from "@/modules/assistant/gate";

export function ChatPage({
  initialStatus,
}: {
  initialStatus: AssistantStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [gate, setGate] = useState<ChatGate | null>(null);
  // Consent is LOCAL — seeded from the server status, flipped by
  // onConsented / onConsentRevoked. No status refetch (bare minimum — the
  // next navigation refetches server-side anyway).
  const [consented, setConsented] = useState(initialStatus.aiConsented);
  const store = useStore();
  const activeSessionId = useAtomValue(activeSessionIdAtom);
  const setActiveSessionId = useSetAtom(activeSessionIdAtom);
  const hydrated = useAtomValue(hydratedAtom);
  const hydrate = useSetAtom(hydrateAtom);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const chat = useChat({
    transport,
    throttle: 32,
    onError: (error) => {
      const g = parseGateError(error);
      if (!g) return;
      // Consent cleared mid-session → flip back to the notice (and clear any
      // quota gate — consent re-asks first). Other gates unchanged.
      if (g === "consent") {
        setConsented(false);
        setGate(null);
      } else setGate(g);
    },
  });

  usePersistSession({ status: chat.status, messages: chat.messages });
  useRefreshAfterTools(chat.status, chat.messages);

  // Stick-to-bottom: a fresh user message pins the thread back to the
  // latest turn so the outgoing message + incoming stream stay in view.
  const { containerRef, isAtBottom, scrollToBottom, handleScroll } =
    useChatScroll({ dependencies: [chat.messages, chat.status] });

  const {
    optimisticRemaining,
    handleSendMessage,
    retry,
    isRunning,
    showError,
  } = useChatControls({
    chat,
    initialRemaining: initialStatus.remaining,
    scrollToBottom,
    onStatusSynced: (fresh) => setStatus((prev) => ({ ...prev, ...fresh })),
  });

  // Resume the highlighted active session once, right after hydrate. Without
  // this, /assistant mounts an EMPTY thread while the sidebar highlights the
  // active session (e.g. one just created by the widget), so the next message
  // would silently overwrite a saved thread. Guard: only on hydrate and only
  // while the thread is still empty - never clobber a fresh thread.
  useEffect(() => {
    if (!hydrated) return;
    const activeSessionId = store.get(activeSessionIdAtom);
    if (!activeSessionId) return;
    if (!Array.isArray(chat.messages)) return;
    const session = store
      .get(sessionsAtom)
      .find((s) => s.id === activeSessionId);
    if (
      session &&
      Array.isArray(session.messages) &&
      session.messages.length > 0 &&
      chat.messages.length === 0
    ) {
      chat.setMessages(session.messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when the store loads; later message changes must not reset the thread
  }, [hydrated]);

  const openSession = useCallback(
    async (id: string) => {
      const session = store.get(sessionsAtom).find((s) => s.id === id);
      if (!session) return;
      setActiveSessionId(id);
      chat.setMessages(session.messages);
      setGate(null);
    },
    [chat, store, setActiveSessionId],
  );

  const newChat = useCallback(() => {
    setActiveSessionId(null);
    chat.setMessages([]);
    setGate(null);
  }, [chat, setActiveSessionId]);

  const hasMessages = Array.isArray(chat.messages) && chat.messages.length > 0;

  return (
    // Vertical chrome above the chat (see CoreLayoutHeader h-16 + (school)/layout
    // margins/padding): 5.5rem on mobile, 7rem on desktop. This keeps the composer
    // above the fold at 100% zoom. Update if the header/layout heights change.
    <div className="mx-auto flex h-[calc(100dvh-5.5rem)] max-w-6xl flex-col gap-4 overflow-y-auto md:h-[calc(100dvh-7rem)] md:flex-row md:overflow-visible">
      <aside className="border-border/60 dark:border-muted-foreground/15 flex w-full min-w-0 shrink-0 flex-col gap-3 rounded-xl border p-3 md:w-72">
        <McpRecommendation
          hasConnectedAgent={status.hasConnectedAgent}
          onDismiss={() => undefined}
        />
        <QuotaMeter
          remaining={optimisticRemaining}
          quota={status.quota}
          nudgeAt={status.nudgeAt}
          hasConnectedAgent={status.hasConnectedAgent}
        />
        <SessionList
          activeSessionId={activeSessionId}
          onSelect={openSession}
          onNew={newChat}
        />
      </aside>
      <main className="border-border/60 dark:border-muted-foreground/15 flex min-h-[60dvh] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border md:min-h-0">
        {gate ? (
          <div className="flex h-full items-center justify-center">
            <ConnectGate reason={gate} />
          </div>
        ) : (
          <>
            <div
              ref={containerRef}
              onScroll={handleScroll}
              data-testid="chat-scroll-container"
              className="relative min-h-0 flex-1 overflow-y-auto"
            >
              {!hasMessages ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
                  <h1 className="text-2xl font-semibold">
                    How can I help you today?
                  </h1>
                  {consented && (
                    <WelcomeSuggestions
                      onPick={(prompt) =>
                        void handleSendMessage({ text: prompt })
                      }
                    />
                  )}
                </div>
              ) : (
                <MessageList messages={chat.messages} isStreaming={isRunning} />
              )}
              {showError && (
                <AssistantErrorMessage error={chat.error} onRetry={retry} />
              )}
              {chat.status === "submitted" && <TypingIndicator />}
              {!isAtBottom && hasMessages && (
                <button
                  type="button"
                  aria-label="Scroll to bottom"
                  onClick={() => scrollToBottom("smooth")}
                  className="bg-background sticky bottom-4 left-1/2 flex w-fit -translate-x-1/2 items-center gap-1 rounded-full border px-3 py-1.5 text-xs shadow-lg"
                >
                  <ChevronDownIcon className="size-4" />
                  Latest
                </button>
              )}
            </div>
            {consented ? (
              <>
                <FollowUpSuggestions
                  onPick={(prompt) => void handleSendMessage({ text: prompt })}
                  messages={chat.messages}
                  isRunning={isRunning}
                  lastTurnFailed={showError}
                />
                <QuotaAlertBar
                  remaining={optimisticRemaining}
                  quota={status.quota}
                  hasConnectedAgent={status.hasConnectedAgent}
                />
                <Composer
                  sendMessage={(params) => void handleSendMessage(params)}
                  status={chat.status}
                  stop={chat.stop}
                />
              </>
            ) : (
              // Sidebar stays; the notice takes the composer slot so sends are
              // impossible until the user agrees.
              <div className="flex justify-center px-4 pt-2 pb-3">
                <ConsentNotice
                  onConsented={() => {
                    setConsented(true);
                    setGate(null);
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
