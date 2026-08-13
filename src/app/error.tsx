"use client"; // Error boundaries must be Client Components
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/common/components/button";

import { env } from "@/env";
import { cn } from "@/common/functions";

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
  return (
    <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-primary text-base font-semibold">500</p>
        <h1 className="text-accent-foreground mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Opps!
        </h1>
        <p className="text-muted-foreground mt-6 text-lg font-medium text-pretty sm:text-xl/8">
          Sorry, an unexpected error has occurred.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button
            onClick={() => {
              reset();
              // Next's reset() only re-renders the boundary; if the cache
              // still holds broken data (or the error was a boundary-cached
              // throw), force a hard reload as a reliable fallback.
              setTimeout(() => window.location.reload(), 100);
            }}
          >
            Try again
          </Button>

          <Link
            href={env.NEXT_PUBLIC_AC_HELPDESK_LINK}
            className={cn(
              buttonVariants({ variant: "link", class: "px-1 py-0" }),
            )}
          >
            Telegram us @afterclass
          </Link>
        </div>
      </div>
    </main>
  );
}
