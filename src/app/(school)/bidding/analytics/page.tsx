import { api } from "@/common/tools/trpc/server";
import { BidChart } from "@/modules/bidding/components/BidChart";
import { BidChartFilterTagGroup } from "@/modules/bidding/components/BidChartFilterTagGroup";
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

export default async function BiddingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const _searchParams = await searchParams;
  const classId = _searchParams.classId;
  const courseCode = _searchParams.course;
  const section = _searchParams.section;
  const rounds = _searchParams.rounds as string | string[];
  const windows = _searchParams.windows as string | string[];

  const [bidResults, bidPrediction] = await Promise.all([
    api.bidResults.getBy({ courseCode, section, classId }),
    api.bidPredictions.getBy({
      classId,
    }),
  ]);

  if (!bidPrediction) return <div>No data available</div>;

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

  const isConfidentBidParticipation =
    bidPrediction.clfHasBidsProbability >= 0.5;

  const confidenceLevel =
    bidPrediction.clfConfidenceScore < 0.3
      ? "Very Low"
      : bidPrediction.clfConfidenceScore < 0.5
        ? "Low"
        : bidPrediction.clfConfidenceScore < 0.7
          ? "Medium"
          : bidPrediction.clfConfidenceScore < 0.9
            ? "High"
            : "Very High";

  return (
    <div className="flex w-160 flex-col justify-center gap-6">
      <pre>{JSON.stringify(bidPrediction, null, 2)}</pre>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between pt-2">
            <span className="text-2xl">Bid Prediction</span>
            <span className="flex items-center gap-1 font-bold tracking-tighter">
              <span className="text-muted-foreground text-xl font-normal">
                e$
              </span>
              <span className="text-primary font-mono text-3xl tabular-nums">
                30.71
              </span>
            </span>
          </CardTitle>
          <CardDescription className="flex flex-col gap-2 text-base">
            {courseCode} {section} - {bidPrediction.bidWindow.acadTermId}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div>Odds of having other bids</div>
            <div className="flex items-center gap-2">
              <Progress value={85} />
              <span>85%</span>
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
              <Progress value={89} />
              <span>89%</span>
            </div>
            <div>
              <Tag
                variant="soft"
                color={
                  bidPrediction.clfConfidenceScore >= 0.5 ? "success" : "error"
                }
                size="sm"
                deletable={false}
              >
                {confidenceLevel}
              </Tag>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div>Estimated success rate</div>
            <SuccessRateSlider />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4 py-2">
          <div className="text-base">Formula</div>
          <div className="">
            <div>Min</div>
            <div className="flex items-center justify-center gap-2">
              <div className="text-center">
                <div className="text-3xl font-bold">30</div>
                <pre className="text-muted-foreground text-sm">recommended</pre>
              </div>
              <pre className="text-muted-foreground text-2xl">=</pre>
              <div className="text-center">
                <div className="text-3xl font-bold">30</div>
                <pre className="text-muted-foreground text-sm">predicted</pre>
              </div>
              <div className="text-muted-foreground text-2xl">+</div>
              <div className="flex flex-col items-center">
                <pre className="text-muted-foreground text-2xl">(</pre>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">1.04</div>
                <pre className="text-muted-foreground text-sm">multiplier</pre>
              </div>
              <div className="text-muted-foreground text-2xl">*</div>
              <div className="text-center">
                <div className="text-3xl font-bold">2.23</div>
                <pre className="text-muted-foreground text-sm">uncertainty</pre>
              </div>
              <div className="flex flex-col items-center">
                <pre className="text-muted-foreground text-2xl">)</pre>
              </div>
            </div>
          </div>
          <div className="">
            <div>Median</div>
            <div className="flex items-center justify-center gap-2">
              <div className="text-center">
                <div className="text-3xl font-bold">30</div>
                <pre className="text-muted-foreground text-sm">recommended</pre>
              </div>
              <pre className="text-muted-foreground text-2xl">=</pre>
              <div className="text-center">
                <div className="text-3xl font-bold">30</div>
                <pre className="text-muted-foreground text-sm">predicted</pre>
              </div>
              <div className="text-muted-foreground text-2xl">+</div>
              <div className="flex flex-col items-center">
                <pre className="text-muted-foreground text-2xl">(</pre>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">1.04</div>
                <pre className="text-muted-foreground text-sm">multiplier</pre>
              </div>
              <div className="text-muted-foreground text-2xl">*</div>
              <div className="text-center">
                <div className="text-3xl font-bold">2.23</div>
                <pre className="text-muted-foreground text-sm">uncertainty</pre>
              </div>
              <div className="flex flex-col items-center">
                <pre className="text-muted-foreground text-2xl">)</pre>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
