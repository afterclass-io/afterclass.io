import Link from "next/link";

import { buttonVariants } from "@/common/components/button";
import { ProgressLink } from "@/common/components/progress-link";
import { env } from "@/env";
import { cn } from "@/common/functions";

export default function NotFound() {
  return (
    <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-primary text-base font-semibold">404</p>
        <h1 className="text-accent-foreground mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Page not found
        </h1>
        <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <ProgressLink href="/">Go back home</ProgressLink>

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
