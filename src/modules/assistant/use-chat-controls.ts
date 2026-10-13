"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import type { AssistantStatus } from "@/server/assistant/status";
import { shouldShowChatError } from "./error-message";

/**
 * Chat controls shared by the /assistant page and the widget panel: the
 * optimistic quota, the send wrapper, the post-turn status sync, retry, and
 * the derived running/error flags.
 */
export function useChatControls({
  chat,
  initialRemaining,
  scrollToBottom,
  onStatusSynced,
}: {
  chat: Pick<
    UseChatHelpers<UIMessage>,
    "messages" | "status" | "error" | "sendMessage"
  >;
  initialRemaining: number;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  // Page-only: merges the fresh server status into the page's own state.
  onStatusSynced?: (fresh: AssistantStatus) => void;
}) {
  // Optimistic quota: decrement instantly on send, reconcile with the server
  // DB count when the turn completes. Seed from props; the background sync
  // below keeps the displayed value honest.
  const [optimisticRemaining, setOptimisticRemaining] =
    useState(initialRemaining);
  // Skip the mount "ready": only sync after a send transitions through a
  // non-ready chat status (submitted/streaming) back to ready.
  const seenRunningRef = useRef(false);
  const notifyStatusSynced = useEffectEvent((fresh: AssistantStatus) => {
    onStatusSynced?.(fresh);
  });

  // Wrap sendMessage: decrement instantly so quota feedback never waits on
  // the stream; refund when the send itself rejects (e.g. immediate 403).
  // The rejection is rethrown, so the caller still sees the failure.
  const handleSendMessage = useCallback(
    async (params: Parameters<UseChatHelpers<UIMessage>["sendMessage"]>[0]) => {
      scrollToBottom("smooth");
      setOptimisticRemaining((prev) => Math.max(0, prev - 1));
      try {
        return await chat.sendMessage(params);
      } catch (e) {
        setOptimisticRemaining((prev) => prev + 1);
        throw e;
      }
    },
    [chat, scrollToBottom],
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
        notifyStatusSynced(fresh);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [chat.status]);

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

  const isRunning = chat.status === "streaming" || chat.status === "submitted";

  // chat.error is a single global state that only reflects the LAST request;
  // a new send clears it, so the bubble naturally maps to the current failed
  // turn. Gate errors (quota/consent) are routed by each component's onError
  // and never shown as a bubble.
  const showError = shouldShowChatError(chat.error);

  return {
    optimisticRemaining,
    setOptimisticRemaining,
    handleSendMessage,
    retry,
    isRunning,
    showError,
  };
}
