import { HeartIcon, HeartUnfilledIcon } from "@/common/components/icons";

export const ReviewRatingGroup = ({ rating }: { rating: number }) => {
  const fullHearts = Math.floor(rating);

  return (
    <span className="flex gap-1" role="img" aria-label={`${rating} hearts`}>
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
      {[...Array(5)].map((_, index) => {
        const Comp = index < fullHearts ? HeartIcon : HeartUnfilledIcon;
        return <Comp key={index} className="text-text-em-low h-4 w-4" />;
      })}
      <span className="sr-only">{rating} rating</span>
    </span>
  );
};
