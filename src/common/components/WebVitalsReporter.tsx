"use client";

import { useEffect, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";

const REPORTED_METRICS = new Set(["LCP", "INP", "CLS"]);
const QUEUE_RETRY_MS = 1000;

// The web-vitals `Metric` type is not shipped as a resolvable declaration in
// next/web-vitals, so type the fields we use locally.
interface FieldMetric {
  name: string;
  value: number;
  rating: string;
}

interface UmamiTracker {
  track: (name: string, data: Record<string, string | number>) => void;
}

const getUmami = (): UmamiTracker | undefined =>
  (window as unknown as { umami?: UmamiTracker }).umami;

function toPayload(metric: FieldMetric): Record<string, string | number> {
  return {
    // CLS is a unitless 0-1 score; LCP and INP are milliseconds. Rounding CLS
    // to an integer would report every value as 0.
    value:
      metric.name === "CLS"
        ? Number(metric.value.toFixed(4))
        : Math.round(metric.value),
    rating: metric.rating,
  };
}

/**
 * Reports Core Web Vitals (LCP, INP, CLS) to the self-hosted Umami sink.
 *
 * Metrics are sent as soon as they fire when the tracker is loaded; metrics
 * that fire before it (the script is `afterInteractive`) are queued and
 * drained by a retry interval. Later metrics are never queued, because
 * web-vitals delivers the final LCP/CLS/INP values at page hide.
 *
 * Renders null and never affects SSR output.
 */
export function WebVitalsReporter() {
  const queued = useRef<Array<[string, Record<string, string | number>]>>([]);

  useReportWebVitals((metric: FieldMetric) => {
    // Local Lighthouse runs must not pollute field data.
    if (!window.location.hostname.endsWith("afterclass.io")) return;
    if (!REPORTED_METRICS.has(metric.name)) return;

    const payload = toPayload(metric);
    const umami = getUmami();
    if (umami) umami.track(metric.name, payload);
    else queued.current.push([metric.name, payload]);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const umami = getUmami();
      if (!umami) return;
      for (const [name, data] of queued.current) umami.track(name, data);
      queued.current = [];
      clearInterval(interval);
    }, QUEUE_RETRY_MS);

    return () => clearInterval(interval);
  }, []);

  return null;
}
