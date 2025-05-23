"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { InView } from "react-intersection-observer";
import { z } from "zod";

import { api } from "@/common/tools/trpc/react";
import { AfterclassIcon } from "@/common/components/icons";
import { ProgressLink } from "@/common/components/progress-link";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";
import { ReviewItem, ReviewItemSkeleton } from "../ReviewItem";
import { FullWidthEnforcer } from "@/common/components/full-width-enforcer";
import { Separator } from "@/common/components/separator";

type BaseReviewItemLoaderProps = {
  variant: "home" | "course" | "professor";
};

export type ReviewItemLoaderHomeProps = BaseReviewItemLoaderProps & {
  variant: "home";
};

export type ReviewItemLoaderCourseProps = BaseReviewItemLoaderProps & {
  variant: "course";
  code: string;
  slugs?: string[];
};

export type ReviewItemLoaderProfessorProps = BaseReviewItemLoaderProps & {
  variant: "professor";
  slug: string;
  courseCodes?: string[];
};

export type ReviewItemLoaderProps =
  | ReviewItemLoaderHomeProps
  | ReviewItemLoaderCourseProps
  | ReviewItemLoaderProfessorProps;

const NoReviewCtaNote = () => (
  <>
    <FullWidthEnforcer />
    <div className="text-muted-foreground w-full space-x-1 px-3 py-10 text-center md:py-12 md:text-sm">
      <span className="text-accent-foreground mr-1">Oh no!</span>
      <span>Looks like no one has reviewed yet.</span>
      <br />
      <span>Help us out by</span>
      <ProgressLink
        href="/submit"
        variant="link"
        className="inline-flex h-fit pb-[1px] md:h-fit md:p-0 md:text-sm"
        data-umami-event="review-empty-cta"
      >
        writing one
      </ProgressLink>
      <span>today 🙈</span>
    </div>
  </>
);

export const ReviewItemLoader = (props: ReviewItemLoaderProps) => {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // prettier-ignore
  const filterFor = z.nativeEnum(ReviewsFilterFor)
                    .safeParse(searchParams?.get("filter"))
                    ?.data 
                  ?? ReviewsFilterFor.ALL;

  // prettier-ignore
  const sortBy = z.nativeEnum(ReviewsSortBy)
                  .safeParse(searchParams?.get("sort"))
                    ?.data
                ?? ReviewsSortBy.LATEST;

  const getInfiniteQuery = () => {
    switch (props.variant) {
      case "course": {
        const { code, slugs } = props;
        const apiFn = session
          ? api.reviews.getByCourseCodeProtected
          : api.reviews.getByCourseCode;
        return apiFn.useSuspenseInfiniteQuery(
          { code, slugs, filterFor, sortBy },
          {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          },
        );
      }
      case "professor": {
        const { slug, courseCodes } = props;
        const apiFn = session
          ? api.reviews.getByProfSlugProtected
          : api.reviews.getByProfSlug;
        return apiFn.useSuspenseInfiniteQuery(
          { slug, courseCodes, filterFor, sortBy },
          {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          },
        );
      }
      default: {
        const apiFn = session
          ? api.reviews.getAllProtected
          : api.reviews.getAll;
        return apiFn.useSuspenseInfiniteQuery(
          { filterFor, sortBy },
          {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          },
        );
      }
    }
  };

  const [{ pages }, reviewQuery] = getInfiniteQuery();
  const { fetchNextPage, hasNextPage, isPending, isRefetching } = reviewQuery;
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    reviewQuery.refetch();
  }, [searchParams]);

  const reviews = pages.flatMap((page) => page.items);

  if (reviews.length === 0) {
    return <NoReviewCtaNote />;
  }

  if (status === "loading" || isPending || isRefetching) {
    return (
      <>
        <Separator />

        {reviews
          .flatMap((_, index) => [
            <ReviewItemSkeleton key={index} />,
            <Separator key={`hr-${index}`} />,
          ])
          .slice(0, -1)}
      </>
    );
  }

  return (
    <>
      <Separator />

      {reviews
        .flatMap((review) => [
          <ReviewItem
            key={review.id}
            variant={props.variant}
            review={review}
            isLocked={!session}
            seeMore={pathname === "/"}
          />,
          <Separator key={`hr-${review.id}`} />,
        ])
        .slice(0, -1)}

      {status === "authenticated" && hasNextPage && (
        <>
          <Separator />
          <InView
            as="div"
            className="flex w-full justify-center p-4"
            onChange={(inView) => inView && fetchNextPage()}
          >
            <AfterclassIcon
              size={64}
              className="text-primary/80 animate-pulse transition-colors duration-1500"
            />
          </InView>
        </>
      )}
    </>
  );
};
