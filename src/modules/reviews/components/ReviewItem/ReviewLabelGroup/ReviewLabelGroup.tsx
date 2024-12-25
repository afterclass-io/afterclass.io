import { toTitleCase } from "@/common/functions";
import { type Review } from "@/modules/reviews/types";
import { reviewItemTheme } from "../ReviewItem.theme";

export const ReviewLabelGroup = ({
  reviewLabels,
}: {
  reviewLabels: Review["reviewLabels"];
}) => {
  const { labels } = reviewItemTheme({
    size: { initial: "sm", md: "md" },
  });

  return (
    <div className={labels()}>
      {reviewLabels.map((label) => (
        <span key={label.name} className="text-nowrap">
          # {toTitleCase(label.name.replaceAll("_", " "))}
        </span>
      ))}
    </div>
  );
};
