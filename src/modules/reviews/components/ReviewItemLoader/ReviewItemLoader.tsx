"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { InView } from "react-intersection-observer";

import { api } from "@/common/tools/trpc/react";
import { AfterclassIcon } from "@/common/components/icons";
import { ProgressLink } from "@/common/components/progress-link";

import { parseReviewParams } from "@/modules/reviews/functions/parseReviewParams";
import {
  buildCourseReviewInput,
  buildHomeReviewInput,
  buildProfessorReviewInput,
  infiniteReviewQueryOptions,
} from "@/modules/reviews/functions/reviewFeedInput";
import { ReviewItem, ReviewItemSkeleton } from "../ReviewItem";
import { FullWidthEnforcer } from "@/common/components/full-width-enforcer";
import { Separator } from "@/common/components/separator";

type BaseReviewItemLoaderProps = {
  variant: "home" | "course" | "professor";
  isAuthenticated: boolean;
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
    <div className="text-muted-foreground w-full space-x-1 px-3 py-4 text-center md:py-6 md:text-sm">
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
  const { isAuthenticated } = props;
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { filterFor, sortBy } = parseReviewParams(searchParams);

  const getInfiniteQuery = () => {
    switch (props.variant) {
      case "course": {
        const { code, slugs } = props;
        const apiFn = isAuthenticated
          ? api.reviews.getByCourseCodeProtected
          : api.reviews.getByCourseCode;
        return apiFn.useSuspenseInfiniteQuery(
          buildCourseReviewInput({ code, slugs, filterFor, sortBy }),
          infiniteReviewQueryOptions,
        );
      }
      case "professor": {
        const { slug, courseCodes } = props;
        const apiFn = isAuthenticated
          ? api.reviews.getByProfSlugProtected
          : api.reviews.getByProfSlug;
        return apiFn.useSuspenseInfiniteQuery(
          buildProfessorReviewInput({ slug, courseCodes, filterFor, sortBy }),
          infiniteReviewQueryOptions,
        );
      }
      default: {
        const apiFn = isAuthenticated
          ? api.reviews.getAllProtected
          : api.reviews.getAll;
        return apiFn.useSuspenseInfiniteQuery(
          buildHomeReviewInput({ filterFor, sortBy }),
          infiniteReviewQueryOptions,
        );
      }
    }
  };

  const [{ pages }, { fetchNextPage, hasNextPage, isPending, isRefetching }] =
    getInfiniteQuery();

  const reviews = pages.flatMap((page) => page.items);

  if (reviews.length === 0) {
    return <NoReviewCtaNote />;
  }

  if (isPending || isRefetching) {
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
            isLocked={!isAuthenticated}
            seeMore={pathname === "/"}
          />,
          <Separator key={`hr-${review.id}`} />,
        ])
        .slice(0, -1)}

      {isAuthenticated && hasNextPage && (
        <>
          <Separator />
          <InView
            as="div"
            className="flex w-full justify-center p-4"
            data-test="review-load-more-sentinel"
            onChange={(inView) => inView && fetchNextPage()}
          >
            <AfterclassIcon
              size={64}
              className="text-primary/80 animate-pulse transition-colors duration-1500"
            />
          </InView>
          <button
            type="button"
            data-test="review-load-more"
            className="sr-only"
            onClick={() => fetchNextPage()}
            aria-hidden
          >
            Load more
          </button>
        </>
      )}
    </>
  );
};
