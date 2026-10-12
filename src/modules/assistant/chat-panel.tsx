"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChevronDownIcon } from "lucide-react";
import { Composer } from "./composer";
import { ConsentNotice } from "./consent-notice";
import { TypingIndicator } from "./typing-indicator";
import { MessageList } from "./message-list";
import { AssistantErrorMessage } from "./error-message";
import { WelcomeSuggestions, FollowUpSuggestions } from "./suggestions";
import { parseGateError, type ChatGate } from "./gate";
import { QuotaAlertBar } from "./quota-alert-bar";
import { usePersistSession } from "./use-persist-session";
import { useChatScroll } from "./use-chat-scroll";
import { useChatControls } from "./use-chat-controls";
import { useSetAtom } from "jotai";
import { hydrateAtom } from "./chat-store";
import type { PageContext } from "@/common/types/assistant";
import { usePageContext } from "./use-page-context";

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

  const hydrate = useSetAtom(hydrateAtom);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Re-seed key for the optimistic quota (see the reseed block after
  // useChatControls): the parent's remaining value is the key.
  const [optimisticSeed, setOptimisticSeed] = useState(remaining);

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

  // Stick-to-bottom: a fresh user message pins the thread back to the
  // latest turn so the outgoing message + incoming stream stay in view.
  const { containerRef, isAtBottom, scrollToBottom, handleScroll } =
    useChatScroll({ dependencies: [chat.messages, chat.status] });

  const {
    optimisticRemaining,
    setOptimisticRemaining,
    handleSendMessage,
    retry,
    isRunning,
    showError,
  } = useChatControls({
    chat,
    initialRemaining: remaining,
    scrollToBottom,
  });

  // Re-seed when the parent pushes a fresh server count (e.g. a remount with
  // new props); local sends in between only touch the seeded copy. (A sync
  // effect calling setState directly trips react-hooks/set-state-in-effect,
  // hence the key pattern.)
  if (optimisticSeed !== remaining) {
    setOptimisticSeed(remaining);
    setOptimisticRemaining(remaining);
  }

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

  return (
    <div className="flex h-full flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="chat-scroll-container"
        className="relative min-h-0 flex-1 overflow-y-auto"
      >
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
      {aiConsented ? (
        <>
          <FollowUpSuggestions
            onPick={(prompt) => void handleSendMessage({ text: prompt })}
            messages={chat.messages}
            isRunning={isRunning}
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
