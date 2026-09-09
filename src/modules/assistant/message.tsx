"use client";

import type { UIMessage } from "ai";
import { Markdown } from "./markdown";
import { ToolCallCard, isToolPart } from "./tool-call-card";

export function Message({ message }: { message: UIMessage }) {
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
        if (part.type === "reasoning") {
          return (
            <pre
              key={i}
              className="text-muted-foreground text-xs whitespace-pre-wrap"
            >
              {"text" in part ? part.text : ""}
            </pre>
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
