import { startTransition } from "react";
import { useRouter } from "next/navigation";
import Router from "next/router";
import { resolveHref } from "next/dist/client/resolve-href";

import { useProgress } from "@/common/providers/ProgressProvider";
import {
  Button,
  type ButtonLinkOrAnchorProps,
} from "@/common/components/Button";

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
export function ProgressLink({ children, ...props }: ButtonLinkOrAnchorProps) {
  const progress = useProgress();
  const router = useRouter();

  return (
    <Button
      as="a"
      onClick={(e) => {
        if (props.external && props.target !== "_self") return;

        e.preventDefault();
        progress.start();

        startTransition(() => {
          if (props.external) {
            window.location.assign(props.href);
          } else {
            // see https://github.com/vercel/next.js/discussions/22025
            router.push(resolveHref(Router, props.href));
          }
          progress.done();
        });
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
