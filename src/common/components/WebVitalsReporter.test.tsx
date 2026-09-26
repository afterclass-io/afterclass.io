// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reportWebVitals = vi.hoisted(() => vi.fn());
vi.mock("next/web-vitals", () => ({ useReportWebVitals: reportWebVitals }));

import { WebVitalsReporter } from "./WebVitalsReporter";

interface Metric {
  name: string;
  value: number;
  rating: string;
}

const track = vi.fn();
let originalLocation: Location;

function setHostname(hostname: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { hostname },
  });
}

function setUmami(available: boolean) {
  (window as unknown as { umami?: unknown }).umami = available
    ? { track }
    : undefined;
}

function emit(metric: Metric) {
  const callback = reportWebVitals.mock.calls.at(-1)?.[0] as
    ((m: Metric) => void) | undefined;
  callback?.(metric);
}

beforeEach(() => {
  vi.useFakeTimers();
  track.mockReset();
  reportWebVitals.mockReset();
  originalLocation = window.location;
  setHostname("afterclass.io");
  setUmami(false);
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
  setUmami(false);
});

describe("WebVitalsReporter", () => {
  it("queues metrics that fire before the tracker loads, then drains them", () => {
    render(<WebVitalsReporter />);

    emit({ name: "LCP", value: 2345.6, rating: "good" });
    expect(track).not.toHaveBeenCalled();

    setUmami(true);
    vi.advanceTimersByTime(1000);

    expect(track).toHaveBeenCalledWith("LCP", { value: 2346, rating: "good" });
  });

  it("sends metrics immediately once the tracker is loaded, preserving CLS precision", () => {
    setUmami(true);
    render(<WebVitalsReporter />);

    // The final CLS/INP values arrive at page hide, after any one-shot flush.
    emit({ name: "CLS", value: 0.0432, rating: "good" });
    expect(track).toHaveBeenCalledWith("CLS", {
      value: 0.0432,
      rating: "good",
    });

    emit({ name: "INP", value: 187.4, rating: "good" });
    expect(track).toHaveBeenCalledWith("INP", { value: 187, rating: "good" });
  });

  it("ignores local and non-production hosts", () => {
    setHostname("localhost");
    setUmami(true);
    render(<WebVitalsReporter />);

    emit({ name: "LCP", value: 1000, rating: "good" });
    expect(track).not.toHaveBeenCalled();
  });

  it("ignores metrics outside the CWV trio", () => {
    setUmami(true);
    render(<WebVitalsReporter />);

    emit({ name: "FCP", value: 900, rating: "good" });
    expect(track).not.toHaveBeenCalled();
  });
});
