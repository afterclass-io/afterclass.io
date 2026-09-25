"use client";

import { useEffect, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";

const REPORTED_METRICS = new Set(["LCP", "INP", "CLS"]);

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

/**
 * Reports Core Web Vitals (LCP, INP, CLS) to the self-hosted Umami sink.
 * Renders null and never affects SSR output.
 */
export function WebVitalsReporter() {
  // The Umami script is `afterInteractive`, so metrics can fire before
  // `window.umami` exists. Buffer until the tracker loads.
  const pending = useRef<FieldMetric[]>([]);

  useReportWebVitals((metric: FieldMetric) => {
    // Local Lighthouse runs must not pollute field data.
    if (!window.location.hostname.endsWith("afterclass.io")) return;
    if (!REPORTED_METRICS.has(metric.name)) return;

    pending.current.push({
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
    });
  });

  useEffect(() => {
    const flush = () => {
      const umami = getUmami();
      if (!umami) return false;
      for (const { name, value, rating } of pending.current) {
        umami.track(name, { value, rating });
      }
      pending.current = [];
      return true;
    };

    const interval = setInterval(() => {
      if (flush()) clearInterval(interval);
    }, 1000);
    if (flush()) clearInterval(interval);

    return () => clearInterval(interval);
  }, []);

  return null;
}
