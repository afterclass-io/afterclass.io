"use client";
import { SuccessRateSlider } from "@/modules/bidding/components/SuccessRateSlider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/common/components/card";
import { Progress } from "@/common/components/progress";
import { Tag } from "@/common/components/tag";
import { formatNumberShortScale, formatPercentage } from "@/common/functions";
import { BidPredictionFormula } from "@/modules/bidding/components/BidPredictionFormula";
import { type SafetyFactor } from "@prisma/client";
import { useState } from "react";
import { Info } from "lucide-react";

export type BidPrediction = {
  value: number;
  safetyFactor: SafetyFactor[];
  uncertainty: number;
};

export const BidPredictionCard = ({
  courseCode,
  section,
  acadTermId,
  hasBidsProbability,
  confidenceScore,
  minPrediction,
  medianPrediction,
}: {
  courseCode: string;
  section: string;
  acadTermId: string;
  hasBidsProbability: number;
  confidenceScore: number;
  minPrediction: BidPrediction;
  medianPrediction: BidPrediction;
}) => {
  const [beatsPercentage, setBeatsPercentage] = useState<number>(70);
  const [recommendedMin, setRecommendedMin] = useState<number>();
  const [recommendedMedian, setRecommendedMedian] = useState<number>();
  const isConfidentBidParticipation = hasBidsProbability >= 0.5;

  const confidenceLevel =
    confidenceScore < 0.3
      ? "Very Low"
      : confidenceScore < 0.5
        ? "Low"
        : confidenceScore < 0.7
          ? "Medium"
          : confidenceScore < 0.9
            ? "High"
            : "Very High";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between pt-2">
          <span className="text-2xl">Bid Prediction</span>
          {recommendedMin !== undefined && recommendedMedian !== undefined && (
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-bold tracking-tighter">
                <span className="text-muted-foreground text-xl font-normal">
                  e$
                </span>
                <span className="text-primary font-mono text-3xl tabular-nums">
                  {formatNumberShortScale(recommendedMin, {
                    minimumFractionDigits: 2,
                    decimals: 2,
                  })}
                </span>
              </span>
              <span className="text-muted-foreground text-xl font-normal">
                -
              </span>
              <span className="text-primary font-mono text-3xl font-bold tracking-tighter tabular-nums">
                {formatNumberShortScale(recommendedMedian, {
                  minimumFractionDigits: 2,
                  decimals: 2,
                })}
              </span>
            </span>
          )}
        </CardTitle>
        <CardDescription className="flex flex-col gap-2 text-base">
          <div>
            {courseCode} {section} - {acadTermId}
          </div>
          <div className="flex items-center gap-2 pl-1 italic">
            <Info size={16} className="inline" />
            Note: AfterClass is not liable for any unsuccessful bids. Use at
            your own risk!
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div>Odds of having other bids</div>
          <div className="flex items-center gap-2">
            <Progress value={hasBidsProbability * 100} />
            <span>
              {formatPercentage(hasBidsProbability, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div>
            <Tag
              variant="soft"
              color={isConfidentBidParticipation ? "success" : "error"}
              size="sm"
              deletable={false}
            >
              {isConfidentBidParticipation ? "Likely" : "Unlikely"}
            </Tag>
          </div>
          <div>Confidence Level</div>
          <div className="flex items-center gap-2">
            <Progress value={confidenceScore * 100} />
            <span>
              {formatPercentage(confidenceScore, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div>
            <Tag
              variant="soft"
              color={confidenceScore >= 0.5 ? "success" : "error"}
              size="sm"
              deletable={false}
            >
              {confidenceLevel}
            </Tag>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div>Estimated success rate</div>
          <SuccessRateSlider
            value={beatsPercentage}
            defaultValue={beatsPercentage}
            onChange={(v) => setBeatsPercentage(Array.isArray(v) ? v[0]! : v)}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4 py-2">
        <div className="text-base">Formula</div>
        <div className="">
          <div>Min</div>
          <BidPredictionFormula
            predicted={minPrediction.value}
            multiplier={
              minPrediction.safetyFactor.find(
                (sf) => sf.beatsPercentage === beatsPercentage,
              )?.multiplier ?? 1
            }
            uncertainty={minPrediction.uncertainty}
            onRecommendedChange={(value) => setRecommendedMin(value)}
          />
        </div>
        <div className="">
          <div>Median</div>
          <BidPredictionFormula
            predicted={medianPrediction.value}
            multiplier={
              medianPrediction.safetyFactor.find(
                (sf) => sf.beatsPercentage === beatsPercentage,
              )?.multiplier ?? 1
            }
            uncertainty={medianPrediction.uncertainty}
            onRecommendedChange={(value) => setRecommendedMedian(value)}
          />
        </div>
      </CardFooter>
    </Card>
  );
};
