"use client";

export function ConnectGate({ reason }: { reason: "quota" | "spend" }) {
  const title =
    reason === "quota"
      ? "You've used your free messages this month."
      : "The free assistant is paused for this month.";
  return (
    <div style={{ padding: 16, maxWidth: 320 }}>
      <h3>{title}</h3>
      <p>
        Connect your own AI agent (Claude, ChatGPT, or Gemini) to keep using
        afterclass.io on your own AI credits - unlimited and always available.
      </p>
      <a href="/settings/agents/connect">Connect your agent</a>
    </div>
  );
}
