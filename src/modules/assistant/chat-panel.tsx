"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Composer } from "./composer";
import { ConsentNotice } from "./consent-notice";
import { TypingIndicator } from "./typing-indicator";
import { MessageList } from "./message-list";
import { AssistantErrorMessage, shouldShowChatError } from "./error-message";
import { WelcomeSuggestions, FollowUpSuggestions } from "./suggestions";
import { parseGateError, type ChatGate } from "./gate";
import { QuotaAlertBar } from "./quota-alert-bar";
import { usePersistSession } from "./use-persist-session";
import { useChatStore } from "./chat-store";
import { usePageContext, type PageContext } from "./use-page-context";

export type ChatPanelProps = {
  quota: number;
  remaining: number;
  hasConnectedAgent: boolean;
  aiDegraded: boolean;
  onGate: (gate: ChatGate) => void;
  // Consent gating. False → notice in place of composer + suggestions
  // (Composer never mounts, so sends are impossible). onConsented flips the
  // parent's local state true; onConsentRevoked flips it back (mid-session
  // consent-403 re-asks). ConnectGate handling for quota unchanged.
  aiConsented: boolean;
  onConsented: () => void;
  onConsentRevoked: () => void;
};

export function ChatPanel({
  quota,
  remaining,
  hasConnectedAgent,
  aiDegraded,
  onGate,
  aiConsented,
  onConsented,
  onConsentRevoked,
}: ChatPanelProps) {
  return (
    <Suspense fallback={null}>
      <ChatPanelInner
        quota={quota}
        remaining={remaining}
        hasConnectedAgent={hasConnectedAgent}
        aiDegraded={aiDegraded}
        onGate={onGate}
        aiConsented={aiConsented}
        onConsented={onConsented}
        onConsentRevoked={onConsentRevoked}
      />
    </Suspense>
  );
}

// Inner component hosted under <Suspense>: usePageContext() reads
// useSearchParams, which requires a Suspense ancestor (same precedent as
// Breadcrumb/TermPicker). The provider stays mounted across navigation, so
// panel-local hosting keeps the diff small and the snapshot send-time fresh.
function ChatPanelInner({
  quota,
  remaining,
  hasConnectedAgent,
  aiDegraded,
  onGate,
  aiConsented,
  onConsented,
  onConsentRevoked,
}: ChatPanelProps) {
  // Snapshot AT SEND TIME, not mount: transport `body` is a Resolvable
  // resolved fresh per send, so a ref mirror of the
  // latest context covers every send path (composer, suggestions, retry) with
  // no composer.tsx change.
  const pageContext = usePageContext();
  const pageContextRef = useRef<PageContext | null>(pageContext);
  useEffect(() => {
    pageContextRef.current = pageContext;
  });

  const transport = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- body resolves per send (not during render); the ref mirror above keeps it fresh
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => {
          const ctx = pageContextRef.current;
          return ctx ? { pageContext: ctx } : {};
        },
      }),
    [],
  );

  const hydrate = useChatStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Optimistic quota: decrement instantly on send, reconcile with the server
  // DB count when the turn completes. Seeded from the parent prop and keyed
  // by the parent's remaining value: when the parent pushes a fresh server
  // count (e.g. a remount with new props), the state re-seeds; local sends
  // in between only touch the seeded copy. (A sync effect calling setState
  // directly trips react-hooks/set-state-in-effect, hence the key pattern.)
  const [optimisticSeed, setOptimisticSeed] = useState(remaining);
  const [optimisticRemaining, setOptimisticRemaining] = useState(remaining);
  if (optimisticSeed !== remaining) {
    setOptimisticSeed(remaining);
    setOptimisticRemaining(remaining);
  }
  // Skip the mount "ready": only sync after a send transitions through a
  // non-ready chat status (submitted/streaming) back to ready.
  const seenRunningRef = useRef(false);

  const chat = useChat({
    transport,
    throttle: 32,
    onError: (error) => {
      const gate = parseGateError(error);
      if (!gate) return;
      // Consent cleared mid-session (e.g. a fresh NULL read on another
      // surface) → flip back to the notice instead of the ConnectGate.
      if (gate === "consent") onConsentRevoked();
      else onGate(gate);
    },
  });

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
    if (chat.status !== "ready" || !seenRunningRef.current) return;
    seenRunningRef.current = false;
    let cancelled = false;
    void fetch("/api/assistant/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh: { remaining?: unknown } | null) => {
        if (cancelled || fresh == null || typeof fresh !== "object") return;
        if (typeof fresh.remaining === "number") {
          setOptimisticRemaining(fresh.remaining);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [chat.status]);

  // The widget has no resume UI and its useChat starts empty on every fresh
  // mount. It keeps ONE session open for the life of this mount (created on the
  // first run-end, reused after) - but it never adopts the shared
  // activeSessionId, so a /assistant thread can never be silently overwritten
  // after client-side navigation (clobber fix). A page reload yields a new
  // session; ChatPage resumes the shared active session on next visit.
  usePersistSession({
    status: chat.status,
    messages: chat.messages,
    keepOwnSession: true,
  });

  const hasMessages = Array.isArray(chat.messages) && chat.messages.length > 0;

  // chat.error is a single global state that only reflects the LAST request;
  // a new send clears it, so the bubble naturally maps to the current failed
  // turn. Gate errors (quota/consent) are routed to onGate instead - never show
  // both the gate surface and the error bubble.
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
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {aiDegraded && (
          <p className="text-muted-foreground px-4 py-2 text-xs">
            AI paused — browsing still works.
          </p>
        )}
        {!hasMessages ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
            <h1 className="text-center text-xl font-semibold sm:text-2xl">
              How can I help you today?
            </h1>
            {aiConsented && (
              <WelcomeSuggestions
                onPick={(prompt) => void handleSendMessage({ text: prompt })}
              />
            )}
          </div>
        ) : (
          <MessageList
            messages={chat.messages}
            isStreaming={
              chat.status === "streaming" || chat.status === "submitted"
            }
          />
        )}
        {showError && (
          <AssistantErrorMessage error={chat.error} onRetry={retry} />
        )}
        {chat.status === "submitted" && <TypingIndicator />}
      </div>
      {aiConsented ? (
        <>
          <FollowUpSuggestions
            onPick={(prompt) => void handleSendMessage({ text: prompt })}
            messages={chat.messages}
            isRunning={
              chat.status === "streaming" || chat.status === "submitted"
            }
            lastTurnFailed={showError}
          />
          <QuotaAlertBar
            remaining={optimisticRemaining}
            quota={quota}
            hasConnectedAgent={hasConnectedAgent}
          />
          <Composer
            sendMessage={(params) => void handleSendMessage(params)}
            status={chat.status}
            stop={chat.stop}
          />
        </>
      ) : (
        // Header + message area stay; composer + suggestions never mount, so
        // sends are impossible until the user agrees.
        <ConsentNotice onConsented={onConsented} compact />
      )}
    </div>
  );
}
