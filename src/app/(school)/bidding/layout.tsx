import { type ReactNode } from "react";

import { CtaButton } from "@/common/components/cta-button";
import { EditIcon, GithubIcon, PlusIcon } from "@/common/components/icons";
import { env } from "@/env";
import { BidWindowScheduleCard } from "@/modules/bidding/components/BidWindowScheduleCard";

export default function BidLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex w-full justify-center gap-6">
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
        <BidWindowScheduleCard />
      </div>
    </div>
  );
}
