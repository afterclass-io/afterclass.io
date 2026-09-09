"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AssistantWidget } from "./assistant-widget";
import { ChatPanel } from "./chat-panel";
import { ConnectGate } from "./connect-gate";
import { type ChatGate } from "./gate";
import { SignedOutPanel } from "./signed-out-panel";
import { useViewport } from "./use-viewport";
import { useWidgetPosition } from "./use-widget-position";
import { WelcomeBubble } from "./welcome-bubble/welcome-bubble";

type Status =
  | { signedIn: false }
  | {
      signedIn: true;
      quota: number;
      used: number;
      remaining: number;
      hasConnectedAgent: boolean;
      nudgeAt: number;
      aiDegraded: boolean;
      // Task 4 kill-switch: present on fresh status payloads; absent on
      // stale/cached payloads (treated as enabled — fail-open for cached
      // status so a stale fetch cannot hide the widget).
      chatEnabled?: boolean;
      widgetEnabled?: boolean;
      // Task 5: consent flag, same staleness story — but fail-CLOSED: absent
      // seeds the local consent state false (notice) until the open-refetch
      // below confirms with the server.
      aiConsented?: boolean;
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
  // Task 5: consent is LOCAL to the widget mount — seeded from the status
  // payload, flipped by the notice (onConsented) and by mid-session
  // consent-403s (onConsentRevoked → re-ask).
  const [consented, setConsented] = useState<boolean>(
    status.aiConsented ?? false,
  );

  // Reset local consent from the server payload whenever it changes (open-
  // refetch, route-change refetch). Local onConsented/onConsentRevoked flips
  // in between do not touch `status`, so this effect does not fight them.
  useEffect(() => {
    setConsented(status.aiConsented ?? false);
  }, [status.aiConsented]);

  const viewport = useViewport();
  const geometry = useWidgetPosition(viewport);

  // Task 4 kill-switch: widget fully hidden when disabled. Anonymous branch
  // below is unchanged (SignedOutPanel → login → status → hidden check).
  if (status.widgetEnabled === false) return null;

  if (gate) return <ConnectGate reason={gate} />;

  return (
    <>
      <AssistantWidget
        open={open}
        onOpenChange={onOpenChange}
        geometry={geometry}
      >
        <ChatPanel
          quota={status.quota}
          remaining={status.remaining}
          hasConnectedAgent={status.hasConnectedAgent}
          aiDegraded={status.aiDegraded}
          onGate={setGate}
          aiConsented={consented}
          onConsented={() => setConsented(true)}
          onConsentRevoked={() => setConsented(false)}
        />
      </AssistantWidget>
      <WelcomeBubble
        open={open}
        onOpen={() => onOpenChange(true)}
        remaining={status.remaining}
        quota={status.quota}
        hasConnectedAgent={status.hasConnectedAgent}
        launcher={geometry.position}
        viewport={viewport}
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

  // Task 5: refetch every time the widget OPENS (in addition to route
  // change above), so each return re-asks: the server consent read resets the
  // local consent state. The widgetEnabled early-return in SignedInAssistant
  // still composes first (fully hidden beats the notice).
  useEffect(() => {
    if (!open) return;
    fetch("/api/assistant/status")
      .then((r) => r.json() as Promise<Status>)
      .then((s) => setStatus(s))
      // Best-effort re-ask: keep the last status on failure.
      .catch(() => undefined);
  }, [open]);

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

  return (
    <SignedInAssistant status={status} open={open} onOpenChange={setOpen} />
  );
}
