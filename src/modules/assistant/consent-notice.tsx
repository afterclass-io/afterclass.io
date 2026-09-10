"use client";

import { useState } from "react";

export function ConsentNotice({
  onConsented,
  compact = false,
}: {
  onConsented: () => void;
  compact?: boolean;
}) {
  // Deliberately NON-persistent: dismissal lives in mount-local state only,
  // so the full notice returns on the next mount / widget reopen (re-ask).
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Assistant needs your approval to start.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="text-primary underline-offset-4 hover:underline"
        >
          Review notice
        </button>
      </div>
    );
  }

  const agree = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/assistant/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agree: true }),
      });
      if (!res.ok) throw new Error(`consent POST failed: ${res.status}`);
      onConsented();
    } catch {
      setError("Could not save your consent — please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="note"
      aria-label="AI consent notice"
      className={
        compact
          ? "mx-3 mb-2 rounded-xl border px-3 py-3 text-sm"
          : "mx-auto w-full max-w-md rounded-xl border px-5 py-4 text-sm"
      }
    >
      <h3 className="font-semibold">Before you chat with AI</h3>
      <p className="text-muted-foreground mt-2">
        Chatting sends your message plus relevant slices of your timetable,
        bids, and roadmap, plus the page you are on. It never sends passwords or
        tokens.
      </p>
      <p className="text-muted-foreground mt-2">
        Requests run through third party AI providers who may train on prompts.
        To use the AI features natively, you must consent to AI processing
        including provider training.
      </p>
      <p className="text-muted-foreground mt-2">
        Alternatively, you may connect your personal AI agents to the MCP.
      </p>
      <p className="text-muted-foreground mt-2">
        Details in our{" "}
        <a
          href="/privacy"
          className="text-primary underline-offset-4 hover:underline"
        >
          privacy policy
        </a>
        .
      </p>
      {error && (
        <p role="alert" className="text-destructive mt-2">
          {error}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={agree}
          disabled={sending}
          className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 font-medium transition-colors disabled:opacity-40"
        >
          {sending ? "Saving…" : "Agree and continue"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          disabled={sending}
          className="hover:bg-muted rounded-full border px-4 py-1.5 transition-colors disabled:opacity-40"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
