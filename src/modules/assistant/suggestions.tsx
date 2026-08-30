"use client";

import type { UIMessage } from "ai";

export type Suggestion = { label: string; prompt: string };

// The first suggestion is the capabilities question - answered by a canned
// response server-side (see src/server/assistant/canned.ts), so it never
// burns quota.
export const WELCOME_SUGGESTIONS: readonly Suggestion[] = [
  {
    label: "What can you do?",
    prompt: "What are your capabilities? What can you help me with?",
  },
  {
    label: "Find a course",
    prompt: "Help me find a course that satisfies my academic requirements.",
  },
  {
    label: "Recommend a bid",
    prompt: "Recommend a bid amount for a module I want to take.",
  },
  {
    label: "Plan my timetable",
    prompt: "Help me plan my timetable for next term.",
  },
];

export const FOLLOW_UP_SUGGESTIONS: readonly Suggestion[] = [
  { label: "Explain that", prompt: "Can you explain that in more detail?" },
  { label: "Give an example", prompt: "Can you show me a concrete example?" },
  { label: "What's next?", prompt: "What should I do next?" },
];

function SuggestionButton({
  suggestion,
  onPick,
}: {
  suggestion: Suggestion;
  onPick: (prompt: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(suggestion.prompt)}
      className="hover:bg-muted rounded-full border px-3.5 py-1.5 text-sm transition-colors"
    >
      {suggestion.label}
    </button>
  );
}

export function WelcomeSuggestions({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-2">
      {WELCOME_SUGGESTIONS.map((s) => (
        <SuggestionButton key={s.prompt} suggestion={s} onPick={onPick} />
      ))}
    </div>
  );
}

/**
 * Follow-up chips should only appear after a completed, SUCCESSFUL assistant
 * turn - never after a lone user message (fresh chat / plain send), a failed
 * turn, or while a run is in flight. `lastTurnFailed` is the shared `showError`
 * flag (`shouldShowChatError(chat.error)`),
 * which reflects the LAST request; the AI SDK v7 UI message parts carry no
 * error part, so this flag is the authoritative failed-turn signal.
 */
export function shouldShowFollowUps(
  messages: UIMessage[],
  isRunning: boolean,
  lastTurnFailed: boolean,
): boolean {
  if (!Array.isArray(messages) || isRunning || lastTurnFailed) return false;
  return messages[messages.length - 1]?.role === "assistant";
}

export function FollowUpSuggestions({
  onPick,
  messages,
  isRunning,
  lastTurnFailed,
}: {
  onPick: (prompt: string) => void;
  messages: UIMessage[];
  isRunning: boolean;
  lastTurnFailed: boolean;
}) {
  if (!shouldShowFollowUps(messages, isRunning, lastTurnFailed)) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {FOLLOW_UP_SUGGESTIONS.map((s) => (
        <SuggestionButton key={s.prompt} suggestion={s} onPick={onPick} />
      ))}
    </div>
  );
}
