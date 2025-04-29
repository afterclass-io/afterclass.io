"use client"; // Error boundaries must be Client Components
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
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-primary text-base font-semibold">500</p>
        <h1 className="text-accent-foreground mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Opps!
        </h1>
        <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
          Sorry, an unexpected error has occurred.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button onClick={() => reset()}>Try again</Button>

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
