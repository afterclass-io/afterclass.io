"use client"; // Error boundaries must be Client Components
import { useEffect } from "react";

import { Button } from "@/common/components/button";
import { NoticeCard } from "@/common/components/NoticeCard";
import { env } from "@/env";

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
      <NoticeCard title="Something went wrong!" isError>
        <Button
          variant="link"
          className="inline text-[length:inherit]"
          onClick={() => reset()}
        >
          Click here to try again.
        </Button>
        <span className="inline">Otherwise, you can get help from us</span>
        <Button
          as="a"
          href={env.NEXT_PUBLIC_AC_HELPDESK_LINK}
          variant="link"
          className="inline px-1 text-[length:inherit]"
          external
        >
          @afterclass
        </Button>
        <span className="inline">on Telegram.</span>
      </NoticeCard>
    </div>
  );
}
