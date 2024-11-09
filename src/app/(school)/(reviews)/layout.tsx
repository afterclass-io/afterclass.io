import { type ReactNode } from "react";

import { CtaCard } from "@/common/components/CtaCard";
import { EditIcon, GithubIcon, PlusIcon } from "@/common/components/CustomIcon";
import { env } from "@/env";

export default function ReviewLayout({
  header,
  filter,
  rating,
  information,
  reviews,
}: {
  reviews: ReactNode;
  header: ReactNode;
  filter: ReactNode;
  rating: ReactNode;
  information: ReactNode;
}) {
  return (
    <section className="flex flex-col items-center space-y-4 md:space-y-6">
      {header}
      {rating}
      {information}
      {filter}
      <div className="relative flex w-full gap-10">
        {reviews}
        <div className="sticky top-0 hidden h-fit w-96 flex-col items-start gap-6 text-nowrap min-[1200px]:flex">
          <CtaCard
            variant="secondary"
            ctaText="Write a review"
            href="/submit"
            leftIcon={<PlusIcon />}
            rightIcon={<EditIcon opacity={0.1} />}
            data-test="cta-write-review"
          />
          <CtaCard
            variant="tertiary"
            ctaText="Contribute to AfterClass OSS"
            href={env.NEXT_PUBLIC_AC_GITHUB_LINK}
            external
            leftIcon={<GithubIcon />}
            data-test="cta-contribute-oss"
          />
        </div>
      </div>
    </section>
  );
}
