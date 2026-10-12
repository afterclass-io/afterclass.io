"use client"; // Error boundaries must be Client Components
import * as Sentry from "@sentry/nextjs";
import type Error from "next/error";
import { useEffect } from "react";

import { ErrorScreen } from "@/common/components/error-screen";
import ThemeProvider from "@/common/providers/ThemeProvider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ErrorScreen reset={reset} />
        </ThemeProvider>
      </body>
    </html>
  );
}
