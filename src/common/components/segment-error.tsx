"use client"; // Error boundaries must be Client Components
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button } from "@/common/components/button";
import { EmptyState } from "@/common/components/empty-state";

export type SegmentErrorProps = {
  error: Error & { digest?: string };
  /** Re-fetches the segment and re-renders it (Next's `retry`). */
  retry: () => void;
};

/**
 * Fallback panel for a route segment error boundary. It reports the error to
 * Sentry and offers a retry, while the layout above keeps rendering.
 */
export function SegmentError({ error, retry }: SegmentErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <EmptyState
      className="w-full"
      title="Something went wrong"
      description="This section failed to load. Try again."
      action={<Button onClick={retry}>Try again</Button>}
    />
  );
}
