import { formatNumberShortScale } from "@/common/functions";
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
  const recommended = predicted + multiplier * uncertainty;

  useEffect(() => {
    if (onRecommendedChange) {
      onRecommendedChange(recommended);
    }
  }, [recommended, onRecommendedChange]);

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="text-center">
        <div className="text-3xl font-bold">
          {formatNumberShortScale(recommended, {
            minimumFractionDigits: 2,
            decimals: 2,
          })}
        </div>
        <pre className="text-muted-foreground text-sm">recommended</pre>
      </div>
      <pre className="text-muted-foreground text-2xl">=</pre>
      <div className="text-center">
        <div className="text-3xl font-bold">
          {formatNumberShortScale(predicted, {
            minimumFractionDigits: 2,
            decimals: 2,
          })}
        </div>
        <pre className="text-muted-foreground text-sm">predicted</pre>
      </div>
      <div className="text-muted-foreground text-2xl">+</div>
      <div className="flex flex-col items-center">
        <pre className="text-muted-foreground text-2xl">(</pre>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold">
          {formatNumberShortScale(multiplier, {
            minimumFractionDigits: 2,
            decimals: 2,
          })}
        </div>
        <pre className="text-muted-foreground text-sm">multiplier</pre>
      </div>
      <div className="text-muted-foreground text-2xl">*</div>
      <div className="text-center">
        <div className="text-3xl font-bold">
          {formatNumberShortScale(uncertainty, {
            minimumFractionDigits: 2,
            decimals: 2,
          })}
        </div>
        <pre className="text-muted-foreground text-sm">uncertainty</pre>
      </div>
      <div className="flex flex-col items-center">
        <pre className="text-muted-foreground text-2xl">)</pre>
      </div>
    </div>
  );
};
