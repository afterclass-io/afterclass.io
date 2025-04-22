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
        className={cn(
          buttonVariants({
            className: "inline px-1 text-[length:inherit]",
          }),
        )}
      >
        @afterclass
      </Link>
      <span className="inline">on Telegram.</span>
    </div>
  );
}
