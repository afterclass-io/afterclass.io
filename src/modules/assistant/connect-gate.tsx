"use client";

import { MessageCircleOffIcon, ShieldCheckIcon } from "lucide-react";
import type { ChatGate } from "./gate";

/**
 * Post-gate surface: replaces the chat thread once the server trips the
 * quota or consent gate. Rendered centered by both hosts (the widget dialog
 * and the full-page chat main), so this is a self-contained max-width card.
 * Copy and the /mcp link are pinned by `connect-gate.test.tsx`.
 */
export function ConnectGate({ reason }: { reason: ChatGate }) {
  const isQuota = reason === "quota";
  const title = isQuota
    ? "You've used your free messages this month."
    : "Please consent to AI use before chatting.";
  const body = isQuota
    ? "Connect your own AI agent (Claude, ChatGPT, or Gemini) to keep using afterclass.io on your own AI credits - unlimited and always available."
    : "Open the assistant and agree to the AI notice to continue. There is no training opt-out — see our privacy policy.";
  const Icon = isQuota ? MessageCircleOffIcon : ShieldCheckIcon;

  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-8">
      <div
        role="status"
        className="bg-muted/40 flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border px-6 py-8 text-center"
      >
        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="text-base font-semibold text-balance">{title}</h3>
        <p className="text-muted-foreground text-sm text-balance">
          {isQuota ? (
            body
          ) : (
            <>
              Open the assistant and agree to the AI notice to continue. There
              is no training opt-out — see{" "}
              <a
                href="/privacy"
                className="text-primary underline-offset-4 hover:underline"
              >
                privacy
              </a>
              .
            </>
          )}
        </p>
        {isQuota && (
          <a
            href="/mcp"
            className="bg-primary text-primary-foreground mt-1 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors"
            data-umami-event="assistant-gate-connect"
          >
            Connect your agent
          </a>
        )}
      </div>
    </div>
  );
}
