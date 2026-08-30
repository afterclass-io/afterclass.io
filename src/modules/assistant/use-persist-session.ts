"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { useChatStore } from "./chat-store";

/**
 * Saves the full thread snapshot to the shared local store whenever a run
 * ends (streaming/submitted -> ready). The session is created lazily on the
 * first completed message. Because the widget and /assistant share the same
 * store, both surfaces stay in sync.
 *
 * Two modes:
 * - Default (page, `/assistant`): reuse the shared `activeSessionId` - the
 *   page resumes the active session on mount instead.
 * - `keepOwnSession` (widget): create ONE session on the first run-end of this
 *   mount, then keep it open for every later run-end. The widget never adopts
 *   the shared `activeSessionId`, so a /assistant thread can never be silently
 *   overwritten after client-side navigation (clobber fix). The widget has no
 *   resume UI and starts empty on a fresh mount, so a full page reload still
 *   yields a new session.
 */
export function usePersistSession({
  status,
  messages,
  keepOwnSession = false,
}: {
  status: "submitted" | "streaming" | "ready" | "error";
  messages: UIMessage[];
  keepOwnSession?: boolean;
}) {
  const prevStatus = useRef(status);
  const ownSessionId = useRef<string | null>(null);

  useEffect(() => {
    const wasRunning =
      prevStatus.current === "streaming" || prevStatus.current === "submitted";
    const running = status === "streaming" || status === "submitted";
    prevStatus.current = status;
    if (!wasRunning || running) return;
    if (!Array.isArray(messages)) return;

    const snapshot = messages.filter(
      (m) => Array.isArray(m.parts) && m.parts.length > 0,
    );
    if (snapshot.length === 0) return;

    void (async () => {
      const store = useChatStore.getState();
      let id: string;
      if (keepOwnSession) {
        ownSessionId.current ??= await store.createSession();
        id = ownSessionId.current;
      } else {
        id = store.activeSessionId ?? (await store.createSession());
      }
      await store.saveSession(id, snapshot);
    })();
  }, [status, messages, keepOwnSession]);
}
