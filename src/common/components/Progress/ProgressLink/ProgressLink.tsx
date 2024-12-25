import { useRouter } from "next/navigation";
import { startTransition } from "react";

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
export function ProgressLink({
  href,
  children,
  ...rest
}: ButtonLinkOrAnchorProps) {
  const progress = useProgress();
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const _href = typeof href === "string" ? href : href.toString();

  return (
    <Button
      as="a"
      href={_href}
      onClick={(e) => {
        if (rest.external && rest.target !== "_self") return;

        e.preventDefault();
        progress.start();

        startTransition(() => {
          if (rest.external) {
            window.location.assign(_href);
          } else {
            router.push(_href);
          }
          progress.done();
        });
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}
