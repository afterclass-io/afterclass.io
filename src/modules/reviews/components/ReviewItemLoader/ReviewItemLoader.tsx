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

export type ReviewItemLoaderHomeProps = {
  variant: "home";
};

export type ReviewItemLoaderCourseProps = {
  variant: "course";
  code: string;
  slugs?: string[];
};

export type ReviewItemLoaderProfessorProps = {
  variant: "professor";
  slug: string;
  courseCodes?: string[];
};

export type ReviewItemLoaderProps =
  | ReviewItemLoaderHomeProps
  | ReviewItemLoaderCourseProps
  | ReviewItemLoaderProfessorProps;

export const ReviewItemLoader = (props: ReviewItemLoaderProps) => {
  const { data: session, status } = useSession();
  const [filterFor, setFilterFor] = useState("all");
  const pathname = usePathname();

  let infiniteQuery;
  switch (props.variant) {
    case "course": {
      const { code, slugs } = props;
      const apiFn = session
        ? api.reviews.getByCourseCodeProtected
        : api.reviews.getByCourseCode;
      infiniteQuery = apiFn.useSuspenseInfiniteQuery(
        { code, slugs },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor,
        },
      );
      break;
    }
    case "professor": {
      const { slug, courseCodes } = props;
      const apiFn = session
        ? api.reviews.getByProfSlugProtected
        : api.reviews.getByProfSlug;
      infiniteQuery = apiFn.useSuspenseInfiniteQuery(
        { slug, courseCodes },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor,
        },
      );
      break;
    }
    default: {
      const apiFn = session ? api.reviews.getAllProtected : api.reviews.getAll;
      infiniteQuery = apiFn.useSuspenseInfiniteQuery(
        {},
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor,
        },
      );
    }
  }

  const [{ pages }, reviewItemsQuery] = infiniteQuery;
  const { fetchNextPage, hasNextPage } = reviewItemsQuery;

  // data will be split in pages
  const toShow = pages.flatMap((page) => page.items);

  if (status === "loading") {
    return (
      <>
        {toShow.map((_, index) => (
          <ReviewItemSkeleton key={index} />
        ))}
      </>
    );
  }

  return toShow.length === 0 ? (
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
      today ️🙈
    </div>
  ) : (
    <div className="flex flex-col items-start gap-4 md:gap-6">
      <ReviewItemsFilter
        value={filterFor}
        onChange={(newValue) => {
          setFilterFor(newValue);
          // reviewItemsQuery.refetch();
        }}
      />
      {toShow.map((review) => (
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
          onChange={(inView, _) => inView && fetchNextPage()}
        >
          <AfterclassIcon
            size={64}
            className="animate-[pulse_3s_ease-in-out_infinite] text-primary-default/60"
          />
        </InView>
      )}
    </div>
  );
};
