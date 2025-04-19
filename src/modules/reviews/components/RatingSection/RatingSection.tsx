import {
  ratingSectionTheme,
  type RatingSectionVariants,
} from "./RatingSection.theme";
import { HeartIcon } from "@/common/components/icons";
import { LockCtaOverlay } from "@/common/components/LockCtaOverlay";
import { StatItem, type StatItemProps } from "@/common/components/StatItem";

export type RatingSectionProps = RatingSectionVariants & {
  headingRatingItem: StatItemProps;
  ratingItems: StatItemProps[];
  isLocked?: boolean;
};

export const RatingSection = ({
  headingRatingItem,
  ratingItems,
  isLocked,
}: RatingSectionProps) => {
  const { wrapper, headingContainer, headingRating, statItemWrapper, icon } =
    ratingSectionTheme({
      size: { initial: "sm", md: "md" },
    });
  return (
    <div className={wrapper()} data-test="rating-section">
      {isLocked && <LockCtaOverlay />}
      <div className={headingContainer()}>
        <div className={headingRating()}>
          <HeartIcon className={icon()} />
          <StatItem
            {...headingRatingItem}
            layout="horizontal"
            isLocked={isLocked}
          />
        </div>
      </div>
      <div className={statItemWrapper()}>
        {ratingItems.length > 0 ? (
          ratingItems.map((item, i) => (
            <StatItem {...item} key={i} isLocked={isLocked} />
          ))
        ) : (
          <p className="w-full py-6 text-center">No Ratings</p>
        )}
      </div>
    </div>
  );
};

const RatingSectionSkeleton = () => {
  const { wrapper, headingContainer, headingRating, statItemWrapper, icon } =
    ratingSectionTheme({
      size: { initial: "sm", md: "md" },
    });
  return (
    <div className={wrapper()}>
      <div className={headingContainer()}>
        <div className={headingRating()}>
          <HeartIcon className={icon()} />
          <StatItem.Skeleton layout="horizontal" label="Average Rating" />
        </div>
      </div>
      <div className={statItemWrapper()}>
        <StatItem.Skeleton />
        <StatItem.Skeleton />
        <StatItem.Skeleton />
      </div>
    </div>
  );
};
RatingSection.Skeleton = RatingSectionSkeleton;
