import Link from "next/link";

import { buttonVariants } from "@/common/components/button";
import { ProgressLink } from "@/common/components/progress-link";
import { env } from "@/env";
import { cn } from "@/common/functions";

export default function NotFound() {
  return (
    <div className="flex justify-center p-6 md:h-full md:items-center md:p-12">
      <ProgressLink
        href="/"
        variant="link"
        className="inline text-[length:inherit]"
      >
        Click here to return to Home.
      </ProgressLink>
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
