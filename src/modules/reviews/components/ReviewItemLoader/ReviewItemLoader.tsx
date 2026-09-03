"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { InView } from "react-intersection-observer";

import { api } from "@/common/tools/trpc/react";
import { AfterclassIcon } from "@/common/components/icons";
import { ProgressLink } from "@/common/components/progress-link";

import type { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";
import { getReviewFeedParams } from "@/modules/reviews/functions/reviewFeed";
import { ReviewItem, ReviewItemSkeleton } from "../ReviewItem";
import { FullWidthEnforcer } from "@/common/components/full-width-enforcer";
import { Separator } from "@/common/components/separator";

type BaseReviewItemLoaderProps = {
  variant: "home" | "course" | "professor";
  // Resolved server-side: the feed procedure (and lock state) must match what
  // the server prefetched for this session, not what the client re-derives
  // while `useSession` is still loading (#516).
  isAuthed: boolean;
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

// Custom hook (module scope, per rules-of-hooks): the feed procedure depends
// on the variant and the server-resolved auth state. `isAuthed` comes from a
// prop, so the hook keeps the same query key across session resolution and
// never re-fetches under a cold protected key (#516).
const useReviewFeedQuery = (
  props: ReviewItemLoaderProps,
  filterFor: ReviewsFilterFor,
  sortBy: ReviewsSortBy,
) => {
  switch (props.variant) {
    case "course": {
      const { code, slugs } = props;
      const apiFn = props.isAuthed
        ? api.reviews.getByCourseCodeProtected
        : api.reviews.getByCourseCode;
      return apiFn.useSuspenseInfiniteQuery(
        { code, slugs, filterFor, sortBy },
        {
          getNextPageParam: (lastPage: { nextCursor?: string }) =>
            lastPage.nextCursor,
        },
      );
    }
    case "professor": {
      const { slug, courseCodes } = props;
      const apiFn = props.isAuthed
        ? api.reviews.getByProfSlugProtected
        : api.reviews.getByProfSlug;
      return apiFn.useSuspenseInfiniteQuery(
        { slug, courseCodes, filterFor, sortBy },
        {
          getNextPageParam: (lastPage: { nextCursor?: string }) =>
            lastPage.nextCursor,
        },
      );
    }
    default: {
      const apiFn = props.isAuthed
        ? api.reviews.getAllProtected
        : api.reviews.getAll;
      return apiFn.useSuspenseInfiniteQuery(
        { filterFor, sortBy },
        {
          getNextPageParam: (lastPage: { nextCursor?: string }) =>
            lastPage.nextCursor,
        },
      );
    }
  }
};

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
  const { status } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { filterFor, sortBy } = getReviewFeedParams(searchParams);

  const [{ pages }, reviewQuery] = useReviewFeedQuery(props, filterFor, sortBy);
  const { fetchNextPage, hasNextPage, isPending } = reviewQuery;

  const reviews = pages.flatMap((page) => page.items);

  if (reviews.length === 0) {
    return <NoReviewCtaNote />;
  }

  // Skeletons only while the session round trip is pending or the query has
  // no data yet — never while refetching, or a background refetch collapses
  // the scrolled feed. Filter/sort changes are already part of the query key,
  // so the query library refetches on its own; no effect needed (#516).
  if (status === "loading" || isPending) {
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
            isLocked={!props.isAuthed}
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
          >
            Load more
          </button>
        </>
      )}
    </>
  );
};
