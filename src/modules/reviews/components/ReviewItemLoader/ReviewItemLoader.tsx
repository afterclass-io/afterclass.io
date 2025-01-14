"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { InView } from "react-intersection-observer";

import { api } from "@/common/tools/trpc/react";
import { AfterclassIcon } from "@/common/components/CustomIcon";
import { ProgressLink } from "@/common/components/Progress";

import { ReviewItem, ReviewItemSkeleton } from "../ReviewItem";
import { ReviewItemsFilter } from "../ReviewItemsFilter";

export enum ReviewsFilterFor {
  ALL = "all",
  UPVOTED = "upvoted",
}

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

const EmptyReviewState = () => (
  <div
    className="w-full px-3 py-6 text-center text-xs text-text-em-mid md:text-sm"
    data-variant="full-width"
  >
    <span>Oh no!</span> Looks like no one has reviewed yet.
    <br />
    Help us out by
    <ProgressLink
      href="/submit"
      variant="link"
      className="mx-1 inline-flex h-fit pb-[1px] text-xs md:h-fit md:p-0 md:text-sm"
      isResponsive
      data-umami-event="no-review-cta"
    >
      writing one
    </ProgressLink>
    today 🙈
  </div>
);

export const ReviewItemLoader = (props: ReviewItemLoaderProps) => {
  const { data: session, status } = useSession();
  const [filterFor, setFilterFor] = useState(ReviewsFilterFor.ALL);
  const pathname = usePathname();

  const getInfiniteQuery = () => {
    switch (props.variant) {
      case "course": {
        const { code, slugs } = props;
        const apiFn = session
          ? api.reviews.getByCourseCodeProtected
          : api.reviews.getByCourseCode;
        return apiFn.useSuspenseInfiniteQuery(
          { code, slugs, filterFor },
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
          { slug, courseCodes, filterFor },
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
          { filterFor },
          {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
          },
        );
      }
    }
  };

  const [{ pages }, reviewQuery] = getInfiniteQuery();
  const { fetchNextPage, hasNextPage } = reviewQuery;

  const reviews = pages.flatMap((page) => page.items);

  if (status === "loading") {
    return (
      <>
        {reviews.map((_, index) => (
          <ReviewItemSkeleton key={index} />
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4 md:gap-6">
      <ReviewItemsFilter
        options={
          session
            ? [
                { label: "All", value: ReviewsFilterFor.ALL },
                { label: "Upvoted", value: ReviewsFilterFor.UPVOTED },
              ]
            : [{ label: "All", value: ReviewsFilterFor.ALL }]
        }
        value={filterFor}
        onChange={async (newValue) => {
          setFilterFor(newValue as ReviewsFilterFor);
          await reviewQuery.refetch();
        }}
      />

      {reviews.length === 0 ? (
        <EmptyReviewState />
      ) : (
        <>
          {reviews.map((review) => (
            <ReviewItem
              key={review.id}
              variant={props.variant}
              review={review}
              isLocked={!session}
              seeMore={pathname === "/"}
            />
          ))}

          {status === "authenticated" && hasNextPage && (
            <InView
              as="div"
              className="flex w-full justify-center"
              onChange={(inView) => inView && fetchNextPage()}
            >
              <AfterclassIcon
                size={64}
                className="animate-[pulse_3s_ease-in-out_infinite] text-primary-default/60"
              />
            </InView>
          )}
        </>
      )}
    </div>
  );
};
