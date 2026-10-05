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

  return (
    <div className="mx-auto flex min-w-fit items-center justify-center gap-1 sm:gap-2">
      <div className="text-center">
        <div className="text-base font-bold sm:text-2xl md:text-3xl">
          {formatNumberShortScale(recommended, {
            minimumFractionDigits: 2,
            decimals: 2,
          })}
        </div>
        <span className="text-muted-foreground block text-[10px] tracking-tight sm:text-xs">
          recommended
        </span>
      </div>
      <span className="text-muted-foreground text-sm font-medium sm:text-xl">
        =
      </span>
      <div className="text-center">
        <div className="text-base font-bold sm:text-2xl md:text-3xl">
          {formatNumberShortScale(predicted, {
            minimumFractionDigits: 2,
            decimals: 2,
          })}
        </div>
        <span className="text-muted-foreground block text-[10px] tracking-tight sm:text-xs">
          predicted
        </span>
      </div>
      <span className="text-muted-foreground text-sm font-medium sm:text-xl">
        +
      </span>
      <span className="text-muted-foreground text-sm font-medium sm:text-xl">
        (
      </span>
      <div className="text-center">
        <div className="text-base font-bold sm:text-2xl md:text-3xl">
          {formatNumberShortScale(multiplier, {
            minimumFractionDigits: 2,
            decimals: 2,
          })}
        </div>
        <span className="text-muted-foreground block text-[10px] tracking-tight sm:text-xs">
          multiplier
        </span>
      </div>
      <span className="text-muted-foreground text-sm font-medium sm:text-xl">
        *
      </span>
      <div className="text-center">
        <div className="text-base font-bold sm:text-2xl md:text-3xl">
          {formatNumberShortScale(uncertainty, {
            minimumFractionDigits: 2,
            decimals: 2,
          })}
        </div>
        <span className="text-muted-foreground block text-[10px] tracking-tight sm:text-xs">
          uncertainty
        </span>
      </div>
      <span className="text-muted-foreground text-sm font-medium sm:text-xl">
        )
      </span>
    </div>
  );
};
