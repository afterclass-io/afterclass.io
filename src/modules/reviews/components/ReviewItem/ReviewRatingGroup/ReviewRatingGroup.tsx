import { HeartIcon, HeartUnfilledIcon } from "@/common/components/CustomIcon";

export const ReviewRatingGroup = ({ rating }: { rating: number }) => {
  const fullHearts = Math.floor(rating);

  return (
    <span className="flex gap-1" role="img" aria-label={`${rating} hearts`}>
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
      {[...Array(5)].map((_, index) => {
        const Comp = index < fullHearts ? HeartIcon : HeartUnfilledIcon;
        return <Comp key={index} className="h-4 w-4 text-text-em-low" />;
      })}
      <span className="sr-only">{rating} rating</span>
    </span>
  );
};
