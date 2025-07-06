import { api } from "@/common/tools/trpc/server";
import { BidChart } from "@/modules/bidding/components/BidChart";
import { BidChartFilterTagGroup } from "@/modules/bidding/components/BidChartFilterTagGroup";

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
      ? "Very Low Confidence"
      : bidPrediction.clfConfidenceScore < 0.5
        ? "Low Confidence"
        : bidPrediction.clfConfidenceScore < 0.7
          ? "Medium Confidence"
          : bidPrediction.clfConfidenceScore < 0.9
            ? "High Confidence"
            : "Very High Confidence";

  return (
    <div className="max-w-200 flex-col justify-center">
      <pre>{JSON.stringify(bidPrediction, null, 2)}</pre>
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
              matched = matched && br.bidWindow.window.toString() === windows;
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
    </div>
  );
}
