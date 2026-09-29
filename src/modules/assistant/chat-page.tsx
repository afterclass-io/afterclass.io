"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import type { AssistantStatus } from "@/server/assistant/status";
import { MessageList } from "@/modules/assistant/message-list";
import { TypingIndicator } from "@/modules/assistant/typing-indicator";
import {
  AssistantErrorMessage,
  shouldShowChatError,
} from "@/modules/assistant/error-message";
import { Composer } from "@/modules/assistant/composer";
import { ConsentNotice } from "@/modules/assistant/consent-notice";
import {
  WelcomeSuggestions,
  FollowUpSuggestions,
} from "@/modules/assistant/suggestions";
import { ConnectGate } from "@/modules/assistant/connect-gate";
import { usePersistSession } from "@/modules/assistant/use-persist-session";
import { useRefreshAfterTools } from "@/modules/assistant/use-refresh-after-tools";
import { useChatStore } from "@/modules/assistant/chat-store";
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
  // Optimistic quota: decrement instantly on send, reconcile with the server
  // DB count when the turn completes. Seed from props; the background sync
  // below keeps the displayed value honest.
  const [optimisticRemaining, setOptimisticRemaining] = useState(
    initialStatus.remaining,
  );
  // Skip the mount "ready": only sync after a send transitions through a
  // non-ready chat status (submitted/streaming) back to ready.
  const seenRunningRef = useRef(false);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const hydrated = useChatStore((s) => s.hydrated);
  const hydrate = useChatStore((s) => s.hydrate);

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

  // Wrap sendMessage: decrement instantly so quota feedback never waits on
  // the stream; refund when the send itself rejects (e.g. immediate 403).
  const handleSendMessage = useCallback(
    async (params: Parameters<typeof chat.sendMessage>[0]) => {
      setOptimisticRemaining((prev) => Math.max(0, prev - 1));
      try {
        return await chat.sendMessage(params);
      } catch (e) {
        setOptimisticRemaining((prev) => prev + 1);
        throw e;
      }
    },
    [chat],
  );

  // Background sync: when a turn completes (running → ready), refetch the
  // authoritative DB count. The mount "ready" is skipped via seenRunningRef
  // so the initial render never fires a status request.
  useEffect(() => {
    if (chat.status === "streaming" || chat.status === "submitted") {
      seenRunningRef.current = true;
      return;
    }
    if (
      (chat.status !== "ready" && chat.status !== "error") ||
      !seenRunningRef.current
    )
      return;
    seenRunningRef.current = false;
    let cancelled = false;
    void fetch("/api/assistant/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh: AssistantStatus | null) => {
        if (cancelled || fresh == null || typeof fresh !== "object") return;
        if (typeof fresh.remaining === "number") {
          setOptimisticRemaining(fresh.remaining);
        }
        setStatus((prev) => ({ ...prev, ...fresh }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [chat.status]);

  // Resume the highlighted active session once, right after hydrate. Without
  // this, /assistant mounts an EMPTY thread while the sidebar highlights the
  // active session (e.g. one just created by the widget), so the next message
  // would silently overwrite a saved thread. Guard: only on hydrate and only
  // while the thread is still empty - never clobber a fresh thread.
  useEffect(() => {
    if (!hydrated) return;
    const { activeSessionId, sessions } = useChatStore.getState();
    if (!activeSessionId) return;
    if (!Array.isArray(chat.messages)) return;
    const session = sessions.find((s) => s.id === activeSessionId);
    if (
      session &&
      Array.isArray(session.messages) &&
      session.messages.length > 0 &&
      chat.messages.length === 0
    ) {
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

  const hasMessages = Array.isArray(chat.messages) && chat.messages.length > 0;
  const isRunning = chat.status === "streaming" || chat.status === "submitted";

  // chat.error is a single global state that only reflects the LAST request;
  // a new send clears it, so the bubble naturally maps to the current failed
  // turn. Gate errors (quota/consent) render the ConnectGate surface instead.
  const showError = shouldShowChatError(chat.error);

  const retry = useCallback(() => {
    if (!Array.isArray(chat.messages)) return;
    const lastUser = [...chat.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUser) return;
    const text = (Array.isArray(lastUser.parts) ? lastUser.parts : [])
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
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!hasMessages ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
                  <h1 className="text-2xl font-semibold">
                    How can I help you today?
                  </h1>
                  {consented && (
                    <WelcomeSuggestions
                      onPick={(prompt) => void handleSendMessage({ text: prompt })}
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
