import type { ReactNode } from "react";

import { PageCtaRail } from "@/modules/bidding/components/PageCtaRail";
import { ReviewCtaButtons } from "@/modules/bidding/components/ReviewCtaButtons";

export default function BidLayout({ children }: { children: ReactNode }) {
  return (
    // No ConstrainedContainer: the content column plus the CTA rail never fitted
    // its 954px cap. min-w-0 lets the content column shrink — the rail is sized
    // to its own content (`max-w-min` + `text-nowrap`) and never will, so without
    // it the row overflows and `justify-center` spills half of that off-canvas
    // to the left, under the fixed sidebar (afterclass-io#545).
    <div className="relative flex w-full justify-center gap-6 md:px-8 [&>:first-child]:min-w-0">
      {children}
      <PageCtaRail>
        <ReviewCtaButtons />
      </PageCtaRail>
    </div>
  );
}
