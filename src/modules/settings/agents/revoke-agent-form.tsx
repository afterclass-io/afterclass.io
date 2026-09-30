"use client";

import { Bot } from "lucide-react";

import { Button } from "@/common/components/button";

export function RevokeAgentForm({
  clientId,
  name,
  action,
}: {
  clientId: string;
  name: string;
  action?: (formData: FormData) => void;
}) {
  // No action in Storybook (server action module is Node-only); the form
  // still renders with the hidden input + labelled button for snapshots.
  if (!action) {
    return (
      <form className="shrink-0" onSubmit={(e) => e.preventDefault()}>
        <input type="hidden" name="clientId" value={clientId} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          aria-label={`Revoke ${name}`}
        >
          Revoke
        </Button>
      </form>
    );
  }
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="clientId" value={clientId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        aria-label={`Revoke ${name}`}
      >
        Revoke
      </Button>
    </form>
  );
}

export function AgentRowIcon() {
  return (
    <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
      <Bot className="size-4" aria-hidden="true" />
    </span>
  );
}
