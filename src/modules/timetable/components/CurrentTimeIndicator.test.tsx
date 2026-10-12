// @vitest-environment jsdom
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { CurrentTimeIndicator } from "./CurrentTimeIndicator";

// 10:00 SGT is 02:00 UTC; 12:00 SGT is 04:00 UTC.
const SERVER_TIME = new Date("2026-03-02T02:00:00Z");
const CLIENT_TIME = new Date("2026-03-02T04:00:00Z");

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("CurrentTimeIndicator", () => {
  let errorSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    vi.useFakeTimers();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("hydrates server HTML rendered at another time without a mismatch", async () => {
    vi.setSystemTime(SERVER_TIME);
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<CurrentTimeIndicator highlightNow />);

    vi.setSystemTime(CLIENT_TIME);
    await act(async () => {
      hydrateRoot(container, <CurrentTimeIndicator highlightNow />);
    });

    const mismatch = errorSpy.mock.calls.some((args) =>
      args.some(
        (a) => typeof a === "string" && /hydrat|did(n't| not) match/i.test(a),
      ),
    );
    expect(mismatch).toBe(false);
  });

  it("shows the line at the client time after mount", async () => {
    vi.setSystemTime(CLIENT_TIME);
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<CurrentTimeIndicator highlightNow />);

    await act(async () => {
      hydrateRoot(container, <CurrentTimeIndicator highlightNow />);
    });

    const line = container.firstElementChild as HTMLElement | null;
    // 12:00 SGT = 720 min; (720 - 480) / 870 of the grid.
    expect(line?.style.top).toBe(`${((720 - 480) / 870) * 100}%`);
  });

  it("moves the line when a minute passes", async () => {
    vi.setSystemTime(CLIENT_TIME);
    const container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      hydrateRoot(container, <CurrentTimeIndicator highlightNow />);
    });
    const before = (container.firstElementChild as HTMLElement).style.top;

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    const after = (container.firstElementChild as HTMLElement).style.top;
    expect(after).not.toBe(before);
  });

  it("renders nothing when highlightNow is off", async () => {
    vi.setSystemTime(CLIENT_TIME);
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<CurrentTimeIndicator />);
    expect(container.innerHTML).toBe("");
  });
});
