"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Composer } from "./composer";
import { TypingIndicator } from "./typing-indicator";
import { MessageList } from "./message-list";
import { AssistantErrorMessage, shouldShowChatError } from "./error-message";
import { WelcomeSuggestions, FollowUpSuggestions } from "./suggestions";
import { parseGateError, type ChatGate } from "./gate";
import { QuotaAlertBar } from "./quota-alert-bar";
import { usePersistSession } from "./use-persist-session";
import { useChatStore } from "./chat-store";

export type ChatPanelProps = {
  quota: number;
  remaining: number;
  hasConnectedAgent: boolean;
  onGate: (gate: ChatGate) => void;
};

export function ChatPanel({
  quota,
  remaining,
  hasConnectedAgent,
  onGate,
}: ChatPanelProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const hydrate = useChatStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const chat = useChat({
    transport,
    throttle: 32,
    onError: (error) => {
      const gate = parseGateError(error);
      if (gate) onGate(gate);
    },
  });

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
  // turn. Gate errors (quota/spend) are routed to onGate instead - never show
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
        {!hasMessages ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
            <h1 className="text-2xl font-semibold">
              How can I help you today?
            </h1>
            <WelcomeSuggestions
              onPick={(prompt) => chat.sendMessage({ text: prompt })}
            />
          </div>
        ) : (
          <MessageList messages={chat.messages} />
        )}
        {showError && (
          <AssistantErrorMessage error={chat.error} onRetry={retry} />
        )}
        {chat.status === "submitted" && <TypingIndicator />}
      </div>
      <FollowUpSuggestions
        onPick={(prompt) => chat.sendMessage({ text: prompt })}
        messages={chat.messages}
        isRunning={chat.status === "streaming" || chat.status === "submitted"}
        lastTurnFailed={showError}
      />
      <QuotaAlertBar
        remaining={remaining}
        quota={quota}
        hasConnectedAgent={hasConnectedAgent}
      />
      <Composer
        sendMessage={chat.sendMessage}
        status={chat.status}
        stop={chat.stop}
      />
    </div>
  );
}
