"use client";

import type { UIMessage } from "ai";
import { Message } from "./message";

export function MessageList({
  messages,
  isStreaming = false,
}: {
  messages: UIMessage[];
  isStreaming?: boolean;
}) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((m, i) => (
        <Message
          key={m.id}
          message={m}
          isStreaming={isStreaming && i === messages.length - 1}
        />
      ))}
    </div>
  );
}
