// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WelcomeBubble } from "./welcome-bubble";

beforeEach(() => { window.localStorage.clear(); vi.useFakeTimers(); });

describe("WelcomeBubble position", () => {
  it("renders nothing before the launcher is placed", () => {
    render(<WelcomeBubble open={false} onOpen={() => undefined} remaining={10} quota={30} hasConnectedAgent={false} launcher={null} viewport={{ width: 1024, height: 768 }} />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("anchors 12px above the default launcher once visible", () => {
    render(<WelcomeBubble open={false} onOpen={() => undefined} remaining={10} quota={30} hasConnectedAgent={false} launcher={{ x: 952, y: 696 }} viewport={{ width: 1024, height: 768 }} />);
    act(() => { vi.advanceTimersByTime(4000); });
    const bubble = screen.getByRole("status");
    // bubbleStyle(default launcher, 1024x768) = { right: 16, bottom: 84 }
    expect(bubble.style.right).toBe("16px");
    expect(bubble.style.bottom).toBe("84px");
  });
});
