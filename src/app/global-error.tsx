"use client"; // Error boundaries must be Client Components
import * as Sentry from "@sentry/nextjs";
import type Error from "next/error";
import { useEffect } from "react";

import { inter, poppins } from "@/common/fonts";
import { Button, buttonVariants } from "@/common/components/button";

import { env } from "@/env";
import ThemeProvider from "@/common/providers/ThemeProvider";
import Link from "next/link";

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
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <ThemeProvider>
          <div className="flex justify-center p-6 md:h-full md:items-center md:p-12">
            <Button
              variant="link"
              className="inline text-[length:inherit]"
              onClick={() => reset()}
            >
              Click here to try again.
            </Button>
            <span className="inline">Otherwise, you can get help from us</span>
            <Link
              href={env.NEXT_PUBLIC_AC_HELPDESK_LINK}
              className={buttonVariants({
                className: "inline px-1 text-[length:inherit]",
              })}
            >
              @afterclass
            </Link>
            <span className="inline">on Telegram.</span>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
