import { useRouter } from "next/navigation";
import { startTransition } from "react";

import { useProgress } from "@/common/providers/ProgressProvider";
import {
  Button,
  type ButtonLinkOrAnchorProps,
} from "@/common/components/Button";

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
        e.preventDefault();
        progress.start();

        startTransition(() => {
          router.push(_href);
          progress.done();
        });
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}
