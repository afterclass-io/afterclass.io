import { RatingGroup } from "@/common/components/rating-group";

export const ReviewRatingGroup = ({ rating }: { rating: number }) => {
  return <RatingGroup readOnly value={rating} iconSize={16} />;
};
