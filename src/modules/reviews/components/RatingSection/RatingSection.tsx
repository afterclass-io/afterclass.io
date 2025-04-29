import { HeartIcon } from "@/common/components/icons";
import { LockedOverlay } from "@/common/components/locked-overlay";
import { StatItem, type StatItemProps } from "@/common/components/stat-item";

export type RatingSectionProps = {
  headingRatingItem: StatItemProps;
  ratingItems: StatItemProps[];
  isLocked?: boolean;
};

export const RatingSection = ({
  headingRatingItem,
  ratingItems,
  isLocked,
}: RatingSectionProps) => {
  return (
    <div
      className="bg-card relative flex w-full flex-col items-start gap-5 rounded-2xl p-6"
      data-test="rating-section"
    >
      {isLocked && <LockedOverlay />}
      <div className="flex w-full items-center gap-10 rounded-none">
        <div className="flex items-center gap-3 rounded-none">
          <HeartIcon className="size-6" />
          <StatItem
            {...headingRatingItem}
            layout="horizontal"
            isLocked={isLocked}
          />
        </div>
      </div>
      <div className="flex w-full flex-wrap items-start justify-between gap-5 rounded-none px-1 py-0 capitalize md:justify-start md:gap-14">
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
  return (
    <div className="bg-card relative flex w-full flex-col items-start gap-5 rounded-2xl p-6">
      <div className="flex w-full items-center gap-10 rounded-none">
        <div className="flex items-center gap-3 rounded-none">
          <HeartIcon className="size-6" />
          <StatItem.Skeleton layout="horizontal" label="Average Rating" />
        </div>
      </div>
      <div className="flex w-full flex-wrap items-start justify-between gap-5 rounded-none px-1 py-0 capitalize md:justify-start md:gap-14">
        <StatItem.Skeleton />
        <StatItem.Skeleton />
        <StatItem.Skeleton />
      </div>
    </div>
  );
};
RatingSection.Skeleton = RatingSectionSkeleton;
