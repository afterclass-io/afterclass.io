"use client";

import { useReportWebVitals } from "next/web-vitals";
import useUmami from "@/common/hooks/use-umami";

const REPORTED_METRICS = new Set(["LCP", "INP", "CLS"]);

/**
 * Reports field Core Web Vitals (LCP, INP, CLS) to the existing Umami
 * analytics sink on every route. Mounted once in the root layout.
 * https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals
 */
export function WebVitalsReporter() {
  const { event } = useUmami();

  useReportWebVitals((metric) => {
    if (!REPORTED_METRICS.has(metric.name)) return;
    event("web-vitals", {
      metric: metric.name,
      value: metric.value,
      id: metric.id,
    });
  });

  return null;
}
