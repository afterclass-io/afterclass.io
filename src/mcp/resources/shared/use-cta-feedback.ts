import { useCallback, useEffect, useRef, useState } from "react";

export type CtaFeedback = "idle" | "saved" | "error";

const DEFAULT_DISMISS_MS = 2500;

/**
 * Transient "Done / Error" confirmation for a single CTA button. Callers flip
 * the state to "saved" or "error" after a tool call resolves; it resets to
 * "idle" after a short delay so the button reads as a normal CTA again.
 * Shared by roadmap-view, bid-explorer and bid-recommendation.
 */
export function useCtaFeedback(dismissMs = DEFAULT_DISMISS_MS) {
  const [feedback, setFeedback] = useState<CtaFeedback>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  const showFeedback = useCallback(
    (kind: "saved" | "error") => {
      setFeedback(kind);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFeedback("idle"), dismissMs);
    },
    [dismissMs],
  );
  return { feedback, showFeedback };
}

/**
 * Per-row variant for widgets with many identical CTAs (e.g. one "Add"
 * button per search result): feedback is keyed by row id, and the shared
 * timer only clears the most recently triggered row.
 */
export function useKeyedCtaFeedback(dismissMs = DEFAULT_DISMISS_MS) {
  const [feedback, setFeedback] = useState<Record<string, "saved" | "error">>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  const showFeedback = useCallback(
    (key: string, kind: "saved" | "error") => {
      setFeedback((prev) => ({ ...prev, [key]: kind }));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setFeedback((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, dismissMs);
    },
    [dismissMs],
  );
  return { feedback, showFeedback };
}
