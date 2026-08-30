"use client";

import type { UIMessage } from "ai";
import { Message } from "./message";

export function MessageList({ messages }: { messages: UIMessage[] }) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((m) => (
        <Message key={m.id} message={m} />
      ))}
    </div>
  );
}
