"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { InView } from "react-intersection-observer";
import { z } from "zod";

import { api } from "@/common/tools/trpc/react";
import { AfterclassIcon } from "@/common/components/CustomIcon";
import { ProgressLink } from "@/common/components/Progress";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";
import { ReviewItem, ReviewItemSkeleton } from "../ReviewItem";

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
  <div
    className="w-full space-x-1 px-3 py-6 text-center text-xs text-text-em-mid md:text-sm"
    data-variant="full-width"
  >
    <span className="mr-1 text-text-em-high">Oh no!</span>
    <span>Looks like no one has reviewed yet.</span>
    <br />
    <span>Help us out by</span>
    <ProgressLink
      href="/submit"
      variant="link"
      className="inline-flex h-fit pb-[1px] text-xs md:h-fit md:p-0 md:text-sm"
      isResponsive
      data-umami-event="no-review-cta"
    >
      writing one
    </ProgressLink>
    <span>today 🙈</span>
  </div>
);

export const ReviewItemLoader = (props: ReviewItemLoaderProps) => {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // prettier-ignore
  const filterFor = z.nativeEnum(ReviewsFilterFor)
                    .safeParse(searchParams.get("filter"))
                    ?.data 
                  ?? ReviewsFilterFor.ALL;

  // prettier-ignore
  const sortBy = z.nativeEnum(ReviewsSortBy)
                  .safeParse(searchParams.get("sort"))
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
        {reviews.map((_, index) => (
          <ReviewItemSkeleton key={index} />
        ))}
      </>
    );
  }

  return (
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
  );
};
