"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { InView } from "react-intersection-observer";

import { api } from "@/common/tools/trpc/react";
import { AfterclassIcon } from "@/common/components/icons";
import { ProgressLink } from "@/common/components/progress-link";

import { ReviewItem } from "../ReviewItem";
import {
  courseFeedInput,
  homeFeedInput,
  MEMBER_FEED_INPUT,
  parseReviewFeedParams,
  professorFeedInput,
} from "../../functions/reviewFeed";
import { FullWidthEnforcer } from "@/common/components/full-width-enforcer";
import { Separator } from "@/common/components/separator";

type BaseReviewItemLoaderProps = {
  variant: "home" | "course" | "professor";
  /**
   * Whether the server resolved a session for this request. It picks the
   * procedure, so the query key never changes after hydration and the page the
   * server prefetched is the page this component reads. The page renders this
   * loader only when the viewer may read reviews, so no card is ever locked.
   */
  isAuthenticated: boolean;
};

type ReviewItemLoaderHomeProps = BaseReviewItemLoaderProps & {
  variant: "home";
};

type ReviewItemLoaderCourseProps = BaseReviewItemLoaderProps & {
  variant: "course";
  code: string;
  slugs?: string[];
};

type ReviewItemLoaderProfessorProps = BaseReviewItemLoaderProps & {
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

const getNextPageParam = (lastPage: { nextCursor?: string }) =>
  lastPage.nextCursor;

export const ReviewItemLoader = (props: ReviewItemLoaderProps) => {
  const { isAuthenticated } = props;
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // The filter and sort values are part of the query key, so the query library
  // fetches again on its own when they change.
  const params = parseReviewFeedParams({
    filter: searchParams?.get("filter"),
    sort: searchParams?.get("sort"),
  });

  const getInfiniteQuery = () => {
    switch (props.variant) {
      case "course": {
        const input = courseFeedInput(props, params);
        return isAuthenticated
          ? api.reviews.getByCourseCodeProtected.useSuspenseInfiniteQuery(
              { ...input, ...MEMBER_FEED_INPUT },
              { getNextPageParam },
            )
          : api.reviews.getByCourseCode.useSuspenseInfiniteQuery(input, {
              getNextPageParam,
            });
      }
      case "professor": {
        const input = professorFeedInput(props, params);
        return isAuthenticated
          ? api.reviews.getByProfSlugProtected.useSuspenseInfiniteQuery(
              { ...input, ...MEMBER_FEED_INPUT },
              { getNextPageParam },
            )
          : api.reviews.getByProfSlug.useSuspenseInfiniteQuery(input, {
              getNextPageParam,
            });
      }
      default: {
        const input = homeFeedInput(params);
        return isAuthenticated
          ? api.reviews.getAllProtected.useSuspenseInfiniteQuery(
              { ...input, ...MEMBER_FEED_INPUT },
              { getNextPageParam },
            )
          : api.reviews.getAll.useSuspenseInfiniteQuery(input, {
              getNextPageParam,
            });
      }
    }
  };

  const [{ pages }, reviewQuery] = getInfiniteQuery();
  const { fetchNextPage, hasNextPage } = reviewQuery;

  const reviews = pages.flatMap((page) => page.items);

  if (reviews.length === 0) {
    return <NoReviewCtaNote />;
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
            seeMore={pathname === "/"}
          />,
          <Separator key={`hr-${review.id}`} />,
        ])
        .slice(0, -1)}

      {hasNextPage && (
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
