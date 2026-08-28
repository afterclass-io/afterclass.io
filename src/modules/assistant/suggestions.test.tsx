// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";
import {
  FOLLOW_UP_SUGGESTIONS,
  FollowUpSuggestions,
  WELCOME_SUGGESTIONS,
  shouldShowFollowUps,
} from "./suggestions";

const userMsg = (text = "hello"): UIMessage => ({ id: "u1", role: "user", parts: [{ type: "text", text }] });
const assistantMsg = (text = "hi there"): UIMessage => ({ id: "a1", role: "assistant", parts: [{ type: "text", text }] });

describe("suggestions", () => {
  it("exposes exactly 4 welcome suggestions", () => {
    expect(WELCOME_SUGGESTIONS).toHaveLength(4);
  });
  it("has unique, non-empty prompts and labels", () => {
    const prompts = new Set(WELCOME_SUGGESTIONS.map((s) => s.prompt));
    const labels = new Set(WELCOME_SUGGESTIONS.map((s) => s.label));
    expect(prompts.size).toBe(4);
    expect(labels.size).toBe(4);
    for (const s of WELCOME_SUGGESTIONS) {
      expect(s.prompt.trim().length).toBeGreaterThan(0);
      expect(s.label.trim().length).toBeGreaterThan(0);
    }
  });
  it("has follow-up suggestions", () => {
    expect(FOLLOW_UP_SUGGESTIONS.length).toBeGreaterThan(0);
  });
});

describe("shouldShowFollowUps (follow-up gating)", () => {
  it("shows follow-ups after a successful assistant turn", () => {
    expect(shouldShowFollowUps([userMsg(), assistantMsg()], false, false)).toBe(true);
  });

  it("hides follow-ups when the last message is a user message (lone user / plain send)", () => {
    expect(shouldShowFollowUps([userMsg()], false, false)).toBe(false);
    expect(shouldShowFollowUps([userMsg(), assistantMsg(), userMsg()], false, false)).toBe(false);
  });

  it("hides follow-ups when the last turn failed", () => {
    expect(shouldShowFollowUps([userMsg(), assistantMsg()], false, true)).toBe(false);
  });

  it("hides follow-ups while a run is in flight", () => {
    expect(shouldShowFollowUps([userMsg(), assistantMsg()], true, false)).toBe(false);
  });

  it("hides follow-ups on an empty thread", () => {
    expect(shouldShowFollowUps([], false, false)).toBe(false);
  });
});

describe("FollowUpSuggestions", () => {
  it("does not render when the last message is a user message", () => {
    render(
      <FollowUpSuggestions onPick={vi.fn()} messages={[userMsg()]} isRunning={false} lastTurnFailed={false} />,
    );
    expect(screen.queryByText("Explain that")).toBeNull();
  });

  it("does not render when the last turn failed", () => {
    render(
      <FollowUpSuggestions
        onPick={vi.fn()}
        messages={[userMsg(), assistantMsg()]}
        isRunning={false}
        lastTurnFailed={true}
      />,
    );
    expect(screen.queryByText("Explain that")).toBeNull();
  });

  it("does not render while a run is in flight", () => {
    render(
      <FollowUpSuggestions onPick={vi.fn()} messages={[userMsg(), assistantMsg()]} isRunning={true} lastTurnFailed={false} />,
    );
    expect(screen.queryByText("Explain that")).toBeNull();
  });

  it("renders follow-up suggestions after a successful assistant message", () => {
    render(
      <FollowUpSuggestions onPick={vi.fn()} messages={[userMsg(), assistantMsg()]} isRunning={false} lastTurnFailed={false} />,
    );
    for (const s of FOLLOW_UP_SUGGESTIONS) {
      expect(screen.getByText(s.label)).toBeTruthy();
    }
  });

  it("calls onPick with the follow-up prompt when a chip is clicked", () => {
    const onPick = vi.fn();
    render(
      <FollowUpSuggestions onPick={onPick} messages={[userMsg(), assistantMsg()]} isRunning={false} lastTurnFailed={false} />,
    );
    fireEvent.click(screen.getByText("Explain that"));
    expect(onPick).toHaveBeenCalledWith(FOLLOW_UP_SUGGESTIONS[0]!.prompt);
  });
});
