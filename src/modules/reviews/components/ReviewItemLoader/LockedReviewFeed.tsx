import { Fragment } from "react";

import { Separator } from "@/common/components/separator";
import { LockedReviewItem } from "../ReviewItem/LockedReviewItem";

const PLACEHOLDER_COUNT = 3;

/**
 * Stands in for the review feed when a signed-out visitor cannot read reviews.
 * Nothing is fetched, so no review data reaches the browser.
 */
export const LockedReviewFeed = () => (
  <>
    {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
      <Fragment key={i}>
        <Separator />
        <LockedReviewItem />
      </Fragment>
    ))}
  </>
);
