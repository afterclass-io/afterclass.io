import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { nanoid } from "nanoid";

// Canonical (normalized) prompt -> canned answer. Only genuinely static,
// capability-style questions. Everything else goes to the model.
// Exact normalized match only - substring/contains matching is intentionally
// NOT used so free-typed questions that happen to contain a canned key still
// reach the model. The only multi-phrase canned entry is the first welcome-
// suggestion chip ("What are your capabilities? What can you help me with?")
// which is an exact normalized phrase, not a contains fallback.
const CAPABILITIES_ANSWER = [
  "I'm the afterclass.io assistant for SMU students. I can:",
  "- Search courses, classes, and professors",
  "- Manage your timetables, bids, and roadmaps",
  "- Recommend bid amounts",
  "- Help you plan your studies",
].join("\n");

const CANNED: Record<string, string> = {
  "what can you do": [
    "I'm the afterclass.io assistant for SMU students. I can:",
    "- Search courses, classes, and professors",
    "- Manage your timetables, bids, and roadmaps",
    "- Recommend bid amounts",
    "- Help you plan your studies",
    "You'll always find these options as buttons when you open the chat.",
  ].join("\n"),
  "what are your capabilities": CAPABILITIES_ANSWER,
  // Exact normalized form of the first welcome-suggestion chip - kept quota-
  // free without resorting to substring matching. See
  // src/modules/assistant/suggestions.tsx: WELCOME_SUGGESTIONS[0].prompt
  "what are your capabilities what can you help me with": CAPABILITIES_ANSWER,
};

export function normalizePrompt(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function findCannedAnswer(messages: UIMessage[]): string | null {
  const last = messages.at(-1);
  if (!last || last.role !== "user") return null;
  // Tolerate legacy content-only messages (no `parts`): treat as empty text so
  // the short-circuit falls through to the normal gates instead of throwing.
  const parts = Array.isArray(last.parts) ? last.parts : [];
  const text = parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join(" ");
  const normalized = normalizePrompt(text);
  if (CANNED[normalized]) return CANNED[normalized];
  // Fall back to a contains match so full-sentence capability questions — e.g.
  // the welcome-suggestion prompt "What are your capabilities? What can you
  // help me with?" — still hit the canned answer instead of burning quota.
  for (const key of Object.keys(CANNED)) {
    if (normalized.includes(key)) return CANNED[key] ?? null;
  }
  return null;
}

function splitChunks(text: string, size = 24): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

export function cannedResponse(text: string): Response {
  const id = nanoid();
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "text-start", id });
      for (const chunk of splitChunks(text)) {
        writer.write({ type: "text-delta", id, delta: chunk });
      }
      writer.write({ type: "text-end", id });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
