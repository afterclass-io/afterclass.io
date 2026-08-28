"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

import {
  markShown, pickEngagementMessage, shouldShowWelcome, WELCOME_AUTO_DISMISS_MS,
  WELCOME_BUBBLE_KEY, WELCOME_SHOW_DELAY_MS, type WelcomePrefs,
} from "./logic";

export function WelcomeBubble({
  open,
  onOpen,
  remaining,
  quota,
  hasConnectedAgent,
}: {
  open: boolean;
  onOpen: () => void;
  remaining: number;
  quota: number;
  hasConnectedAgent: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      setVisible(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(WELCOME_BUBBLE_KEY);
        const prefs: WelcomePrefs = raw ? (JSON.parse(raw) as WelcomePrefs) : { lastShownAt: null, shownCount: 0 };
        if (!shouldShowWelcome(prefs, Date.now())) return;
        localStorage.setItem(WELCOME_BUBBLE_KEY, JSON.stringify(markShown(prefs)));
      } catch {
        // storage unavailable - non-fatal
      }
      setMessage(pickEngagementMessage(hasConnectedAgent, remaining, quota));
      setVisible(true);
    }, WELCOME_SHOW_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, hasConnectedAgent, remaining, quota]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), WELCOME_AUTO_DISMISS_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setVisible(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-24 z-40 flex max-w-72 items-start gap-2 rounded-2xl border bg-popover p-3 text-sm shadow-xl motion-reduce:animate-none"
      data-umami-event="assistant-welcome-shown"
    >
      <button type="button" onClick={onOpen} className="text-left" data-umami-event="assistant-welcome-tryit">
        {message}
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
        className="rounded p-0.5 hover:bg-muted"
        data-umami-event="assistant-welcome-dismiss"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
