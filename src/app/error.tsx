"use client"; // Error boundaries must be Client Components
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ErrorScreen } from "@/common/components/error-screen";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return <ErrorScreen reset={reset} />;
}
