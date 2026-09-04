import { type ReactNode } from "react";

import { CtaButton } from "@/common/components/cta-button";
import { EditIcon, GithubIcon, PlusIcon } from "@/common/components/icons";
import { env } from "@/env";
import { BidWindowScheduleCard } from "@/modules/bidding/components/BidWindowScheduleCard";
import { ReviewCtaButtons } from "@/modules/bidding/components/ReviewCtaButtons";

/**
 * Renders bid content alongside a desktop-only sticky rail of review and contribution actions.
 *
 * @param children - The primary bid content to display
 * @returns The responsive bid layout
 */
export default function BidLayout({ children }: { children: ReactNode }) {
  return (
    // No ConstrainedContainer: the content column plus the CTA rail never fitted
    // its 954px cap. min-w-0 lets the content column shrink — the rail is sized
    // to its own content (`max-w-min` + `text-nowrap`) and never will, so without
    // it the row overflows and `justify-center` spills half of that off-canvas
    // to the left, under the fixed sidebar (afterclass-io#545).
    <div className="relative flex w-full justify-center gap-6 md:px-8 [&>:first-child]:min-w-0">
      {children}
      <div className="sticky top-24 hidden h-fit max-w-min flex-col items-start gap-6 text-nowrap lg:flex">
        <CtaButton
          variant="secondary"
          ctaText="Write a review"
          href="/submit"
          iconLeft={<PlusIcon />}
          iconRight={<EditIcon opacity={0.1} />}
          data-test="cta-write-review"
          data-umami-event="cta-btn-write-review"
        />
        <CtaButton
          variant="outline"
          ctaText="Contribute to AfterClass OSS"
          className="text-muted-foreground bg-card/80 hover:text-accent-foreground/80"
          href={env.NEXT_PUBLIC_AC_GITHUB_LINK}
          target="_blank"
          iconLeft={<GithubIcon />}
          data-test="cta-contribute-oss"
          data-umami-event="cta-btn-contribute-oss"
        />
        <ReviewCtaButtons />
        <BidWindowScheduleCard />
      </div>
    </div>
  );
}
