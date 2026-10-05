import { formatNumberShortScale } from "@/common/functions";
import { recommendedBid } from "@/modules/bidding/utils/bid-prediction";
import { useEffect } from "react";

export const BidPredictionFormula = ({
  predicted,
  multiplier,
  uncertainty,
  onRecommendedChange,
}: {
  predicted: number;
  multiplier: number;
  uncertainty: number;
  onRecommendedChange?: (value: number) => void;
}) => {
  const recommended = recommendedBid(predicted, multiplier, uncertainty);

  useEffect(() => {
    if (onRecommendedChange) {
      onRecommendedChange(recommended);
    }
  }, [recommended, onRecommendedChange]);

  const formattedRecommended = formatNumberShortScale(recommended, {
    minimumFractionDigits: 2,
    decimals: 2,
  });
  const formattedPredicted = formatNumberShortScale(predicted, {
    minimumFractionDigits: 2,
    decimals: 2,
  });
  const formattedMultiplier = formatNumberShortScale(multiplier, {
    minimumFractionDigits: 2,
    decimals: 2,
  });
  const formattedUncertainty = formatNumberShortScale(uncertainty, {
    minimumFractionDigits: 2,
    decimals: 2,
  });

  return (
    <div
      className="mx-auto flex w-full max-w-sm items-center justify-center gap-1 sm:gap-2"
      role="region"
      aria-label={`Formula: ${formattedRecommended} recommended equals ${formattedPredicted} predicted plus (${formattedMultiplier} multiplier times ${formattedUncertainty} uncertainty)`}
    >
      <div className="text-center" aria-hidden="true">
        <div className="text-base font-bold sm:text-2xl md:text-3xl">
          {formattedRecommended}
        </div>
        <span className="text-muted-foreground block text-[10px] tracking-tight sm:text-xs">
          recommended
        </span>
      </div>
      <span
        className="text-muted-foreground text-sm font-medium sm:text-xl"
        aria-hidden="true"
      >
        =
      </span>
      <div className="text-center" aria-hidden="true">
        <div className="text-base font-bold sm:text-2xl md:text-3xl">
          {formattedPredicted}
        </div>
        <span className="text-muted-foreground block text-[10px] tracking-tight sm:text-xs">
          predicted
        </span>
      </div>
      <span
        className="text-muted-foreground text-sm font-medium sm:text-xl"
        aria-hidden="true"
      >
        +
      </span>
      <span
        className="text-muted-foreground text-sm font-medium sm:text-xl"
        aria-hidden="true"
      >
        (
      </span>
      <div className="text-center" aria-hidden="true">
        <div className="text-base font-bold sm:text-2xl md:text-3xl">
          {formattedMultiplier}
        </div>
        <span className="text-muted-foreground block text-[10px] tracking-tight sm:text-xs">
          multiplier
        </span>
      </div>
      <span
        className="text-muted-foreground text-sm font-medium sm:text-xl"
        aria-hidden="true"
      >
        *
      </span>
      <div className="text-center" aria-hidden="true">
        <div className="text-base font-bold sm:text-2xl md:text-3xl">
          {formattedUncertainty}
        </div>
        <span className="text-muted-foreground block text-[10px] tracking-tight sm:text-xs">
          uncertainty
        </span>
      </div>
      <span
        className="text-muted-foreground text-sm font-medium sm:text-xl"
        aria-hidden="true"
      >
        )
      </span>
    </div>
  );
};
