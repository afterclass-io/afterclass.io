"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AssistantWidget } from "./assistant-widget";
import { ChatPanel } from "./chat-panel";
import { ConnectGate } from "./connect-gate";
import { type ChatGate } from "./gate";
import { SignedOutPanel } from "./signed-out-panel";
import { WelcomeBubble } from "./welcome-bubble/welcome-bubble";

type Status =
  | { signedIn: false }
  | {
      signedIn: true;
      quota: number;
      used: number;
      remaining: number;
      spendPaused: boolean;
      hasConnectedAgent: boolean;
      nudgeAt: number;
    }
  | null;

function SignedInAssistant({
  status,
  open,
  onOpenChange,
}: {
  status: Extract<Status, { signedIn: true }>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [gate, setGate] = useState<ChatGate | null>(null);

  useEffect(() => {
    if (status.spendPaused) setGate("spend");
  }, [status.spendPaused]);

  if (gate) return <ConnectGate reason={gate} />;

  return (
    <>
      <AssistantWidget open={open} onOpenChange={onOpenChange}>
        <ChatPanel
          quota={status.quota}
          remaining={status.remaining}
          hasConnectedAgent={status.hasConnectedAgent}
          onGate={setGate}
        />
      </AssistantWidget>
      <WelcomeBubble
        open={open}
        onOpen={() => onOpenChange(true)}
        remaining={status.remaining}
        quota={status.quota}
        hasConnectedAgent={status.hasConnectedAgent}
      />
    </>
  );
}

export function AssistantProvider() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/assistant/status")
      .then((r) => r.json() as Promise<Status>)
      .then((s) => setStatus(s))
      .catch(() => setStatus(null));
    // Deps: re-fetch on route change - login uses client-side router.push, so
    // this provider stays mounted and must pick up the new auth state.
  }, [pathname]);

  // If the user was mid-login (we stashed "assistant-was-open" before the
  // redirect), re-open the widget and clear the flag so it only fires once.
  useEffect(() => {
    if (!status?.signedIn) return;
    let wasOpen = false;
    try {
      wasOpen = sessionStorage.getItem("assistant-was-open") === "1";
      if (wasOpen) sessionStorage.removeItem("assistant-was-open");
    } catch {
      // storage unavailable - non-fatal
    }
    if (wasOpen) setOpen(true);
  }, [status]);

  if (pathname?.startsWith("/assistant")) return null; // full-page chat replaces the widget there

  if (!status?.signedIn) {
    // Anonymous users still get the widget - it leads them to login.
    return (
      <AssistantWidget open={open} onOpenChange={setOpen}>
        <SignedOutPanel />
      </AssistantWidget>
    );
  }

  return <SignedInAssistant status={status} open={open} onOpenChange={setOpen} />;
}
