import { useCallback, useEffect, useRef, useState } from "react";

export type CtaFeedback = "idle" | "saved" | "error";

const DEFAULT_DISMISS_MS = 2500;

/**
 * Single CTA-feedback factory (Task 5 — the factory already exists; do NOT
 * merge the two hooks: they serve different call sites with different
 * signatures, and merging would force every caller through one shape).
 *
 * When to use which:
 * - `useCtaFeedback` — ONE CTA per view (single button). Used by roadmap-view
 *   ("Copy this roadmap") and bid-explorer ("Set bid to $X"). State is a
 *   single `"idle" | "saved" | "error"`; call `showFeedback("saved"|"error")`
 *   after the tool call resolves/rejects.
 * - `useKeyedCtaFeedback` — MANY identical CTAs per view (one per row).
 *   Used by course-search (one "Add <section>" button per result row). State
 *   is a `Record<rowKey, "saved" | "error">` (absent key = idle); call
 *   `showFeedback(rowKey, "saved"|"error")`.
 *
 * Both auto-reset after `dismissMs` so the button reads as a normal CTA again.
 * The only ad-hoc `setTimeout` feedback left in views is calendar-links'
 * clipboard "Copied" toggle — clipboard state, not a tool-call CTA, so it
 * stays local (documented at its call site).
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
  const [feedback, setFeedback] = useState<Record<string, "saved" | "error">>(
    {},
  );
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
