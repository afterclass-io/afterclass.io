import { api } from "@/common/tools/trpc/server";
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
import type { SafetyFactor } from "@prisma/client";
import { ModAlternativesCard } from "@/modules/bidding/components/ModAlternativesCard";
import { BidAnalyticsClient } from "@/modules/bidding/components/BidAnalyticsClient";
import { selectOneClassPerTerm } from "@/modules/bidding/utils/selectOneClassPerTerm";

/** Filter safety factors to the subset used by bid prediction cards. */
function filterSafetyFactors(
  factors: SafetyFactor[],
  acadTermId: string,
  predictionType: PredictionType,
): SafetyFactor[] {
  return factors.filter(
    (sf) =>
      sf.acadTermId === acadTermId &&
      sf.multiplierType === MultiplierType.EMPIRICAL &&
      sf.predictionType === predictionType,
  );
}

export default async function BiddingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const _searchParams = await searchParams;
  const classId = _searchParams.classId;
  let courseCode = _searchParams.course;
  let section = _searchParams.section;
  const initialRounds = _searchParams.rounds
    ? Array.isArray(_searchParams.rounds)
      ? _searchParams.rounds
      : [_searchParams.rounds]
    : [];
  const initialWindows = _searchParams.windows
    ? Array.isArray(_searchParams.windows)
      ? _searchParams.windows
      : [_searchParams.windows]
    : [];

  const _class = await api.classes.getAll({ id: classId, limit: 1 });
  if (!courseCode || !section) {
    if (!classId) {
      return notFound();
    }
    if (_class.length === 0) {
      return notFound();
    }
    courseCode = _class[0]!.course.code;
    section = _class[0]!.section;
  }

  const classInfo = _class[0];
  const professorId = classInfo?.professor?.id;

  // Reference timings for timing-based section selection
  const referenceTimings =
    classInfo?.classTimings.map((t) => ({
      dayOfWeek: t.dayOfWeek,
      startTime: t.startTime,
    })) ?? [];

  const professors = await api.professors.getProfessorsByClassId({ classId: classId! });

  // SPEC-2: Single data source — course+professor matching when professor exists,
  // fall back to section-specific only when professor is null (TBA).
  const allBidResults = professorId
    ? selectOneClassPerTerm(
        await api.bidResults.getByCourseProfessor({
          courseCode: courseCode!,
          professorId,
        }),
        referenceTimings,
        section,
      )
    : await api.bidResults.getBy({
        courseCode,
        section,
        classId,
      });

  const [bidPrediction, safetyFactor] = await Promise.all([
    api.bidPredictions.getBy({ classId }),
    api.safetyFactors.getAll(),
  ]);

  if (allBidResults.length === 0 && !bidPrediction) {
    return (
      <div className="flex w-full max-w-5xl flex-col gap-6 pt-2">
        <div className="text-muted-foreground text-center">No data available</div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 pt-2">
      {/* Class Info Summary Card — server rendered */}
      {classInfo && (
        <Card>
          <CardHeader>
            {/* SPEC-5: Course name as primary title */}
            <CardTitle className="text-xl">
              {classInfo.course.name}
            </CardTitle>
            {/* SPEC-5: Course code as subtitle */}
            <CardDescription>
              {classInfo.course.code}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* SPEC-5: Professor | Section | Grading Basis in 3-column grid */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Professor</span>
                <p className="font-medium">{classInfo.professor?.name ?? "TBA"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Section</span>
                <p className="font-medium">{classInfo.section}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Grading Basis</span>
                <p className="font-medium">{classInfo.gradingBasis ?? "N/A"}</p>
              </div>
            </div>

            {/* Meeting Information Table — BOSS-style */}
            {(classInfo.classTimings.length > 0 ||
              classInfo.classExamTimings.some((t) => t.date)) && (
              <>
                <div className="text-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="py-1 text-left font-medium">Type</th>
                        <th className="py-1 text-left font-medium">Day</th>
                        <th className="py-1 text-left font-medium">Time</th>
                        <th className="py-1 text-left font-medium">Venue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classInfo.classTimings.map((t, i) => (
                        <tr key={`class-${i}`} className="border-b border-border/50">
                          <td className="py-1.5 font-medium">Class</td>
                          <td className="py-1.5">{t.dayOfWeek}</td>
                          <td className="py-1.5 font-mono tabular-nums">
                            {t.startTime}-{t.endTime}
                          </td>
                          {/* SPEC-5: Venue uses text-foreground for readability */}
                          <td className="py-1.5 text-foreground">
                            {t.venue ?? "—"}
                          </td>
                        </tr>
                      ))}
                      {classInfo.classExamTimings
                        .filter((t) => t.date)
                        .map((t, i) => (
                          <tr key={`exam-${i}`} className="border-b border-border/50">
                            <td className="py-1.5 font-medium">Exam</td>
                            <td className="py-1.5">
                              {t.date
                                ? new Date(t.date).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                              <br />
                              <span>{t.dayOfWeek}</span>
                            </td>
                            <td className="py-1.5 font-mono tabular-nums">
                              {t.startTime}-{t.endTime}
                            </td>
                            <td className="py-1.5 text-foreground">
                              {t.venue ?? "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* No schedule data fallback */}
            {classInfo.classTimings.length === 0 &&
              !classInfo.classExamTimings.some((t) => t.date) && (
                <div className="text-sm">
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Meeting Information
                  </span>
                  <p className="text-muted-foreground text-sm italic mt-1">
                    No schedule data available
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Chart + Filters + Table — client component */}
      <BidAnalyticsClient
        allBidResults={allBidResults}
        courseCode={courseCode!}
        section={section!}
        initialRounds={initialRounds}
        initialWindows={initialWindows}
        currentWindowBidWindow={
          bidPrediction
            ? `${bidPrediction.bidWindow.acadTermId}/${bidPrediction.bidWindow.round}/${bidPrediction.bidWindow.window}`
            : undefined
        }
      />

      {/* Prediction Card — server rendered */}
      {!bidPrediction ? (
        <div className="text-muted-foreground text-center">
          No bid prediction available for this class.
        </div>
      ) : (
        <BidPredictionCard
          courseCode={courseCode}
          section={section}
          bidWindow={{
            acadTermId: bidPrediction.bidWindow.acadTermId,
            round: bidPrediction.bidWindow.round,
            window: bidPrediction.bidWindow.window,
          }}
          hasBidsProbability={bidPrediction.clfHasBidsProbability}
          confidenceScore={bidPrediction.clfConfidenceScore}
          minPrediction={{
            value: bidPrediction.minPredicted,
            safetyFactor: filterSafetyFactors(
              safetyFactor,
              bidPrediction.bidWindow.acadTermId,
              PredictionType.MIN,
            ),
            uncertainty: bidPrediction.minUncertainty,
          }}
          medianPrediction={{
            value: bidPrediction.medianPredicted,
            safetyFactor: filterSafetyFactors(
              safetyFactor,
              bidPrediction.bidWindow.acadTermId,
              PredictionType.MEDIAN,
            ),
            uncertainty: bidPrediction.medianUncertainty,
          }}
        />
      )}

      <ModAlternativesCard
        professors={professors}
        sessions={classInfo?.classTimings || []}
        courseCode={courseCode}
      />
    </div>
  );
}
