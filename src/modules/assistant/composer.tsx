"use client";

import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

export type ComposerProps = {
  sendMessage: (params: { text: string }) => void;
  status: "ready" | "streaming" | "submitted" | "error";
  stop: () => void;
};

export function Composer({ sendMessage, status, stop }: ComposerProps) {
  const [input, setInput] = useState("");
  const isRunning = status === "streaming" || status === "submitted";
  const canSend = input.trim().length > 0 && !isRunning;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <form
      onSubmit={submit}
      className="relative flex max-w-full items-end gap-2 px-3 pt-2 pb-3 shadow-[0px_-20px_20px_1px_rgba(0,0,0,0.05)] dark:shadow-none"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Send a message..."
        aria-label="Message input"
        rows={1}
        className="bg-muted/40 focus:border-ring [field-sizing:content] max-h-32 min-h-10 w-full min-w-0 resize-none rounded-xl border px-3 py-2 text-sm outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(e);
          }
        }}
      />
      {isRunning ? (
        <button
          type="button"
          onClick={stop}
          aria-label="Stop generating"
          className="bg-muted shrink-0 rounded-full p-2.5"
        >
          <SquareIcon className="size-4" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="bg-primary text-primary-foreground shrink-0 rounded-full p-2.5 disabled:opacity-40"
        >
          <ArrowUpIcon className="size-4" />
        </button>
      )}
    </form>
  );
}
