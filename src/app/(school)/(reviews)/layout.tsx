import { Suspense, type ReactNode } from "react";

import { ConstrainedContainer } from "@/common/components/constrained-container";
import { BidWindowScheduleCard } from "@/modules/bidding/components/BidWindowScheduleCard";
import { BidWindowScheduleCardSkeleton } from "@/modules/bidding/components/BidWindowScheduleCardSkeleton";
import { PageCtaRail } from "@/modules/bidding/components/PageCtaRail";

export default function ReviewLayout({
  header,
  rating,
  filter,
  information,
  reviews,
}: {
  header: ReactNode;
  rating: ReactNode;
  filter: ReactNode;
  information: ReactNode;
  reviews: ReactNode;
}) {
  return (
    <ConstrainedContainer className="flex flex-col items-center space-y-4 md:space-y-6">
      {header}
      {rating}
      {filter}
      {information}
      <div className="relative flex w-full items-start justify-center gap-6 [&>:first-child]:min-w-0">
        {reviews}
        <PageCtaRail>
          <Suspense fallback={<BidWindowScheduleCardSkeleton />}>
            <BidWindowScheduleCard />
          </Suspense>
        </PageCtaRail>
      </div>
    </ConstrainedContainer>
  );
}
