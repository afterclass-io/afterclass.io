// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  event: vi.fn(),
  reported: [] as Array<(metric: unknown) => void>,
}));

vi.mock("@/common/hooks/use-umami", () => ({
  default: () => ({ event: m.event }),
}));
vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (callback: (metric: unknown) => void) => {
    m.reported.push(callback);
  },
}));

import {
  WEB_VITAL_EVENT,
  WebVitalsReporter,
  toWebVitalEvent,
} from "./WebVitalsReporter";

const metric = (name: string, value: number) => ({
  id: "v5-1",
  name,
  value,
  delta: value,
  rating: "good",
  navigationType: "navigate",
  entries: [],
});

describe("toWebVitalEvent", () => {
  it("rounds LCP and INP to whole milliseconds", () => {
    expect(toWebVitalEvent(metric("LCP", 1234.56))).toEqual({
      metric: "LCP",
      value: 1235,
      rating: "good",
      navigation: "navigate",
    });
    expect(toWebVitalEvent(metric("INP", 87.2))?.value).toBe(87);
  });

  it("keeps three decimals for CLS", () => {
    expect(toWebVitalEvent(metric("CLS", 0.123456))?.value).toBe(0.123);
  });

  it("ignores metrics outside LCP, INP and CLS", () => {
    expect(toWebVitalEvent(metric("TTFB", 200))).toBeNull();
    expect(toWebVitalEvent(metric("FCP", 900))).toBeNull();
  });

  it("carries no field beyond the four metric fields", () => {
    const payload = toWebVitalEvent(metric("LCP", 100));
    expect(Object.keys(payload ?? {}).sort()).toEqual([
      "metric",
      "navigation",
      "rating",
      "value",
    ]);
  });
});

describe("WebVitalsReporter", () => {
  it("sends reported metrics to Umami and drops the rest", () => {
    m.event.mockReset();
    render(<WebVitalsReporter />);
    const report = m.reported.at(-1);
    report?.(metric("LCP", 2000));
    report?.(metric("TTFB", 100));
    expect(m.event).toHaveBeenCalledTimes(1);
    expect(m.event).toHaveBeenCalledWith(WEB_VITAL_EVENT, {
      metric: "LCP",
      value: 2000,
      rating: "good",
      navigation: "navigate",
    });
  });
});
