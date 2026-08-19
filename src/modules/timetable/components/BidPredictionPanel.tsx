"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/common/tools/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/card";
import { Skeleton } from "@/common/components/skeleton";
import { SuccessRateSlider } from "@/modules/bidding/components/SuccessRateSlider";
import { computeRecommendedRange } from "@/modules/bidding/utils/bid-prediction";
import { formatBidAmount } from "@/modules/timetable/functions/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BidPredictionPanelProps = {
  classId: string;
  courseCode: string;
  section: string;
  acadTermId: string;
  /** Currently-selected bid window (from the dialog's round+window selector). */
  round?: string;
  window?: number;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Bid prediction card (analytics-style summary): recommended min/median with
 * a success-rate slider, fed by `bidPredictions.getBy` / `safetyFactors.getAll`.
 * Extracted verbatim from the original SlotBidPanel so the shared bid dialog
 * reuses the same markup.
 */
export function BidPredictionPanel({
  classId,
  courseCode,
  section,
  acadTermId,
  round,
  window: windowNum,
}: BidPredictionPanelProps) {
  // ---- Data queries ----
  const predictionQuery = api.bidPredictions.getBy.useQuery(
    { classId },
    { staleTime: 60_000 },
  );

  // Safety factors power the success-rate slider (same model as
  // /bidding/analytics: recommended = predicted + multiplier × uncertainty).
  const safetyFactorsQuery = api.safetyFactors.getAll.useQuery(undefined, {
    staleTime: 300_000,
  });

  // Success-rate the predicted min/median assume (matches analytics' 70%
  // default).
  const [beatsPercentage, setBeatsPercentage] = useState(70);

  // ---- Derived ----
  const prediction = predictionQuery.data;

  // Confidence-adjusted recommendations (same formula as analytics, via the
  // shared math: predicted + multiplier × uncertainty, multiplier from the
  // empirical safety factors for the prediction's term at the chosen
  // success rate). These respond to the success-rate slider below.
  const recommended = useMemo(
    () =>
      prediction
        ? computeRecommendedRange(
            prediction,
            safetyFactorsQuery.data ?? [],
            beatsPercentage,
          )
        : null,
    [prediction, safetyFactorsQuery.data, beatsPercentage],
  );

  return (
    <Card className="gap-2" data-test="bid-prediction-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Bid Prediction</CardTitle>
        {prediction && (
          <CardDescription className="flex flex-col gap-0.5">
            <span>
              {courseCode} {section} · {acadTermId}
            </span>
            <span>
              Round {round ?? "—"} · Window {windowNum ?? "—"}
            </span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {predictionQuery.isLoading && (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        )}
        {predictionQuery.isError && (
          <p className="text-muted-foreground text-sm">
            Unable to load prediction.
          </p>
        )}
        {prediction && recommended && (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">
                  Recommended Min
                </span>
                <p className="text-primary font-mono text-xl font-bold tabular-nums">
                  {formatBidAmount(recommended.min)}
                </p>
                <p className="text-muted-foreground text-xs">
                  predicted {formatBidAmount(prediction.minPredicted)} ±{" "}
                  {formatBidAmount(prediction.minUncertainty)}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">
                  Recommended Median
                </span>
                <p className="text-primary font-mono text-xl font-bold tabular-nums">
                  {formatBidAmount(recommended.median)}
                </p>
                <p className="text-muted-foreground text-xs">
                  predicted {formatBidAmount(prediction.medianPredicted)} ±{" "}
                  {formatBidAmount(prediction.medianUncertainty)}
                </p>
              </div>
            </div>
            <div className="border-border mt-3 border-t pt-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                <span className="text-muted-foreground">
                  Estimated success rate
                </span>
                <span className="text-foreground font-medium">
                  {beatsPercentage}%
                </span>
              </div>
              <SuccessRateSlider
                value={beatsPercentage}
                defaultValue={70}
                onChange={(v) =>
                  setBeatsPercentage(Array.isArray(v) ? v[0]! : v)
                }
                wrapperClassName="px-1 pt-1 pb-2"
              />
              <p className="text-muted-foreground text-xs pt-5">
                Recommended = predicted + multiplier × uncertainty; higher
                confidence widens the safety band.{" "}
                <Link
                  href={`/bidding/analytics?course=${courseCode}&section=${section}&classId=${classId}`}
                  className="text-primary hover:underline"
                >
                  Full analytics
                </Link>
              </p>
            </div>
          </>
        )}
        {!predictionQuery.isLoading &&
          !predictionQuery.isError &&
          !prediction && (
            <p className="text-muted-foreground text-sm">
              No prediction available for this class yet.
            </p>
          )}
      </CardContent>
    </Card>
  );
}
