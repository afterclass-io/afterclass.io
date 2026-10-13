"use client";
import { useReportWebVitals } from "next/web-vitals";
import { useCallback } from "react";
import useUmami from "@/common/hooks/use-umami";

// Next.js ships no type declarations for its metric object, so this type lists
// the fields read here. See the `useReportWebVitals` API reference.
type WebVitalsMetric = {
  name: string;
  value: number;
  rating: string;
  navigationType: string;
};

const REPORTED_METRICS = new Set(["LCP", "INP", "CLS"]);

export const WEB_VITAL_EVENT = "web-vital";

/**
 * Maps a Next.js metric to the Umami event payload, or null for a metric that
 * is not reported. The payload holds the metric name, its value, the rating and
 * the navigation type only. The page URL is already on every Umami event, and
 * no student data is added here.
 */
export function toWebVitalEvent(metric: WebVitalsMetric) {
  if (!REPORTED_METRICS.has(metric.name)) return null;
  return {
    metric: metric.name,
    // CLS is a unitless score, so keep three decimals. LCP and INP are in ms.
    value:
      metric.name === "CLS"
        ? Math.round(metric.value * 1000) / 1000
        : Math.round(metric.value),
    rating: metric.rating,
    navigation: metric.navigationType,
  };
}

export const WebVitalsReporter = () => {
  const { event } = useUmami();

  // The callback reference must stay stable, or Next.js reports duplicates.
  const report = useCallback(
    (metric: WebVitalsMetric) => {
      const data = toWebVitalEvent(metric);
      if (data) event(WEB_VITAL_EVENT, data);
    },
    [event],
  );
  useReportWebVitals(report);

  return null;
};
