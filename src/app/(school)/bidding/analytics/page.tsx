import { api } from "@/common/tools/trpc/server";
import { BidChart } from "@/modules/bidding/components/BidChart";
import { BidChartFilterTagGroup } from "@/modules/bidding/components/BidChartFilterTagGroup";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/card";
import { BidPredictionCard } from "@/modules/bidding/components/BidPredictionCard";
import { notFound } from "next/navigation";
import { MultiplierType, PredictionType } from "@prisma/client";

export default async function BiddingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const _searchParams = await searchParams;
  const classId = _searchParams.classId;
  let courseCode = _searchParams.course;
  let section = _searchParams.section;
  const rounds = _searchParams.rounds as string | string[];
  const windows = _searchParams.windows as string | string[];

  const [bidResults, bidPrediction, safetyFactor] = await Promise.all([
    api.bidResults.getBy({ courseCode, section, classId }),
    api.bidPredictions.getBy({
      classId,
    }),
    api.safetyFactors.getAll(),
  ]);

  if (bidResults.length === 0) return <div>No data available</div>;

  if (!courseCode || !section) {
    const _class = await api.classes.getAll({ id: classId, limit: 1 });
    if (_class.length === 0) {
      return notFound();
    }
    courseCode = _class[0]!.course.code;
    section = _class[0]!.section;
  }

  const bidResultsWithBids = bidResults.filter(
    (r) =>
      !!r.afterProcessVacancy &&
      !!r.min &&
      !!r.median &&
      r.min > 0 &&
      r.median > 0,
  );

  const [roundsInBidResultsWithBids, windowsInBidResultsWithBids] =
    bidResultsWithBids
      .map((br) => br.bidWindow)
      .reduce(
        (acc, bidWindow) => {
          if (!acc[0].includes(bidWindow.round)) {
            acc[0].push(bidWindow.round);
          }
          if (!acc[1].includes(bidWindow.window.toString())) {
            acc[1].push(bidWindow.window.toString());
          }
          return acc;
        },
        [[], []] as [string[], string[]],
      );

  return (
    <div className="flex w-160 flex-col justify-center gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="pt-2 text-2xl">
            Historical Bidding Trend
          </CardTitle>
          <CardDescription className="flex flex-col gap-2">
            <div>
              {courseCode} {section} - historical bids across academic terms and
              rounds
            </div>
            <div>
              <span>Note: missing bid information implies one of</span>
              <ol className="list-decimal pl-6">
                <li className="pl-2">Class was not offered in that term</li>
                <li className="pl-2">Class was preassigned</li>
                <li className="pl-2">Class received no bids</li>
              </ol>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <BidChart
            chartData={bidResultsWithBids
              .filter((br) => {
                let matched = true;
                if (rounds && Array.isArray(rounds)) {
                  matched = matched && rounds.includes(br.bidWindow.round);
                } else if (rounds) {
                  matched = matched && br.bidWindow.round === rounds;
                }

                if (windows && Array.isArray(windows)) {
                  matched =
                    matched && windows.includes(br.bidWindow.window.toString());
                } else if (windows) {
                  matched =
                    matched && br.bidWindow.window.toString() === windows;
                }

                return matched;
              })
              .map((br) => ({
                bidWindow: `${br.bidWindow.acadTermId}/${br.bidWindow.round}/${br.bidWindow.window}`,
                price: [br.min!, br.median!],
                size: br.beforeProcessVacancy - br.afterProcessVacancy!,
              }))}
          />
          <BidChartFilterTagGroup
            label="Rounds"
            items={roundsInBidResultsWithBids.sort().map((round) => ({
              label: round,
              value: round,
            }))}
          />
          <BidChartFilterTagGroup
            label="Windows"
            items={windowsInBidResultsWithBids.sort().map((round) => ({
              label: round,
              value: round,
            }))}
          />
        </CardContent>
      </Card>

      {!bidPrediction ? (
        <div className="text-muted-foreground text-center">
          No bid prediction available for this class.
        </div>
      ) : (
        <BidPredictionCard
          courseCode={courseCode}
          section={section}
          acadTermId={bidPrediction.bidWindow.acadTermId}
          hasBidsProbability={bidPrediction.clfHasBidsProbability}
          confidenceScore={bidPrediction.clfConfidenceScore}
          minPrediction={{
            value: bidPrediction.minPredicted,
            safetyFactor: safetyFactor.filter(
              (sf) =>
                sf.acadTermId === bidPrediction.bidWindow.acadTermId &&
                sf.multiplierType === MultiplierType.EMPIRICAL &&
                sf.predictionType === PredictionType.MIN,
            ),
            uncertainty: bidPrediction.minUncertainty,
          }}
          medianPrediction={{
            value: bidPrediction.medianPredicted,
            safetyFactor: safetyFactor.filter(
              (sf) =>
                sf.acadTermId === bidPrediction.bidWindow.acadTermId &&
                sf.multiplierType === MultiplierType.EMPIRICAL &&
                sf.predictionType === PredictionType.MEDIAN,
            ),
            uncertainty: bidPrediction.medianUncertainty,
          }}
        />
      )}
    </div>
  );
}
