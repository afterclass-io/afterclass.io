import type { UIMessage } from "ai";

export type ToolPart =
  | Extract<UIMessage["parts"][number], { type: "dynamic-tool" }>
  | Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;

export function isToolPart(part: UIMessage["parts"][number]): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

export type ToolStatus = "running" | "done" | "error";

export function toolStatus(part: ToolPart): ToolStatus {
  const state = part.state;
  if (state === "input-streaming" || state === "input-available" || state === "approval-requested" || state === "approval-responded") {
    return "running";
  }
  if (state === "output-error") return "error";
  return "done"; // output-available
}

export function toolLabel(part: ToolPart): string {
  return part.type === "dynamic-tool" ? part.toolName : part.type.replace(/^tool-/, "");
}
