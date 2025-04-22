import { toTitleCase } from "@/common/functions";
import { type Review } from "@/modules/reviews/types";

export const ReviewLabelGroup = ({
  reviewLabels,
}: {
  reviewLabels: Review["reviewLabels"];
}) => {
  return (
    <div className="text-secondary-foreground flex flex-wrap content-start items-start gap-x-4 gap-y-1 self-stretch capitalize">
      {reviewLabels.map((label) => (
        <span key={label.name} className="text-nowrap">
          # {toTitleCase(label.name.replaceAll("_", " "))}
        </span>
      ))}
    </div>
  );
};
