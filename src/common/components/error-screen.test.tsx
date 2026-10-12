// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorScreen } from "./error-screen";

vi.mock("@/env", () => ({
  env: { NEXT_PUBLIC_AC_HELPDESK_LINK: "https://t.me/afterclass" },
}));

describe("ErrorScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the 500 copy and the helpdesk link", () => {
    render(<ErrorScreen reset={vi.fn()} />);
    expect(screen.getByText("500")).toBeTruthy();
    expect(screen.getByText("Oops!")).toBeTruthy();
    expect(
      screen.getByText("Sorry, an unexpected error has occurred."),
    ).toBeTruthy();
    const link = screen.getByText("Telegram us @afterclass");
    expect(link.getAttribute("href")).toBe("https://t.me/afterclass");
  });

  it("Try again calls reset, then hard-reloads after 100ms", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    const reset = vi.fn();
    render(<ErrorScreen reset={reset} />);
    fireEvent.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
