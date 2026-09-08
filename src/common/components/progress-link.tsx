"use client";
import { type ComponentProps, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useProgress } from "@/common/providers/ProgressProvider";
import { buttonVariants } from "@/common/components/button";

import { type VariantProps } from "class-variance-authority";
import { cn } from "@/common/functions";

/**
 * A link component that shows a progress indicator during navigation.
 * Wraps navigation actions with a progress bar to provide visual feedback during page transitions.
 *
 * @see https://buildui.com/posts/global-progress-in-nextjs
 *
 * @example
 * // Internal navigation with progress indicator
 * <ProgressLink href="/dashboard">
 *   Go to Dashboard
 * </ProgressLink>
 *
 * @example
 * // External link with custom target
 * <ProgressLink href="https://example.com" external>
 *   Visit External Site
 * </ProgressLink>
 *
 * @example
 * // hard navigation
 * <ProgressLink href="/submit" external target="_self">
 *   Go to Submission Page (hard navigation)
 * </ProgressLink>
 */
export function ProgressLink({
  variant,
  size,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  const progress = useProgress();
  const router = useRouter();

  return (
    <Link
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={(e) => {
        e.preventDefault();
        progress.start();

        startTransition(() => {
          router.push(props.href.toString());
          progress.done();
        });
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
