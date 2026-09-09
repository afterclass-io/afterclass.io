"use client";

import type { ChatGate } from "./gate";

export function ConnectGate({ reason }: { reason: ChatGate }) {
  const title =
    reason === "quota"
      ? "You've used your free messages this month."
      : "Please consent to AI use before chatting.";
  if (reason === "consent") {
    return (
      <div style={{ padding: 16, maxWidth: 320 }}>
        <h3>{title}</h3>
        <p>
          Open the assistant and agree to the AI notice to continue. There is no
          training opt-out — see <a href="/privacy">privacy</a>.
        </p>
      </div>
    );
  }
  return (
    <div style={{ padding: 16, maxWidth: 320 }}>
      <h3>{title}</h3>
      <p>
        Connect your own AI agent (Claude, ChatGPT, or Gemini) to keep using
        afterclass.io on your own AI credits - unlimited and always available.
      </p>
      <a href="/mcp">Connect your agent</a>
    </div>
  );
}
