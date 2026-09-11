"use client";

import type { UIMessage } from "ai";
import { Markdown } from "./markdown";
import { ReasoningCard } from "./reasoning-card";
import { ToolCallCard, isToolPart } from "./tool-call-card";

export function Message({
  message,
  isStreaming = false,
}: {
  message: UIMessage;
  isStreaming?: boolean;
}) {
  // Tolerate parts-less messages (persisted/legacy shapes): render as empty.
  const parts = Array.isArray(message.parts) ? message.parts : [];
  if (message.role === "user") {
    const text = parts
      .filter((p) => p.type === "text")
      .map((p) => ("text" in p ? p.text : ""))
      .join("");
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground w-fit max-w-[min(85%,56ch)] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm">
          {text}
        </div>
      </div>
    );
  }

  const toolParts = parts.filter(isToolPart);

  return (
    <div className="flex flex-col gap-2">
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <Markdown key={i} text={"text" in part ? part.text : ""} />;
        }
        // Reasoning parts are model-internal deliberation: visible-but-collapsed
        // by default (never a top-level answer bubble). The final text part
        // still carries the answer.
        if (part.type === "reasoning") {
          const text = "text" in part ? part.text : "";
          if (!text?.trim()) return null;
          return (
            <ReasoningCard key={i} text={text} isStreaming={isStreaming} />
          );
        }
        if (isToolPart(part)) {
          const stepIndex = toolParts.findIndex((t) => t === part) + 1;
          return (
            <ToolCallCard
              key={i}
              part={part}
              stepIndex={stepIndex}
              stepTotal={toolParts.length}
            />
          );
        }
        return null; // step-start, file, source-* - not rendered in v1
      })}
    </div>
  );
}
