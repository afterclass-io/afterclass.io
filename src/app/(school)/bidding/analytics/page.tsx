import { type Metadata } from "next";
import { api } from "@/common/tools/trpc/server";
import { auth } from "@/server/auth";
import { canViewData } from "@/server/ecfg/public-data";
import { AuthWall } from "@/common/components/auth-wall";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/card";
import { BidPredictionCard } from "@/modules/bidding/components/BidPredictionCard";
import { PredictionType } from "@/generated/prisma/enums";
import { ModAlternativesCard } from "@/modules/bidding/components/ModAlternativesCard";
import { BidAnalyticsClient } from "@/modules/bidding/components/BidAnalyticsClient";
import { AddToTimetableButton } from "@/modules/bidding/components/AddToTimetableButton";
import { BiddingEntryView } from "@/modules/bidding/components/BiddingEntryView";
import type { ComboboxOption } from "@/common/components/combobox";
import { EmptyState } from "@/common/components/empty-state";
import { selectOneClassPerTerm } from "@/modules/bidding/utils/selectOneClassPerTerm";
import { filterSafetyFactors } from "@/modules/bidding/utils/bid-prediction";
import { formatDateSGT } from "@/common/functions/format-date-sgt";

// `classId`, `course`, `section`, `rounds`, `windows` and `prof` all select a
// facet of this page, so the canonical drops them.
export const metadata: Metadata = {
  alternates: { canonical: "/bidding/analytics" },
  robots: { index: false, follow: false },
};

export default async function BiddingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();

  if (!(await canViewData(session, "classData"))) {
    return (
      <div className="flex w-full max-w-5xl flex-col gap-6 pt-4">
        <AuthWall variant="full" feature="bidding analytics" />
      </div>
    );
  }

  const _searchParams = await searchParams;
  let classId = _searchParams.classId;
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

  // Entry state: no class identified yet — let the user pick a course and/or
  // professor via CourseProfessorFilter (same bidirectional pattern as /bidding),
  // then a section from the class list (each card links back here with
  // course/section/classId params).
  if (!classId && (!courseCode || !section)) {
    const profSlug = _searchParams.prof;
    const [classes, selectedCourseData, selectedProfData] = await Promise.all([
      api.classes.getAll({ courseCode, profSlug }),
      courseCode ? api.courses.getByCourseCode({ code: courseCode }) : null,
      profSlug ? api.professors.getBySlug({ slug: profSlug }) : null,
    ]);

    const selectedCourse: ComboboxOption | null = selectedCourseData
      ? {
          value: selectedCourseData.code,
          label: `${selectedCourseData.code} ${selectedCourseData.name}`,
        }
      : null;

    const selectedProfessor: ComboboxOption | null = selectedProfData
      ? {
          value: selectedProfData.slug,
          label: selectedProfData.name,
        }
      : null;

    return (
      <BiddingEntryView
        initialClasses={classes.map((c) => ({
          id: c.id,
          section: c.section,
          course: c.course,
          classTimings: c.classTimings,
          classExamTimings: c.classExamTimings,
          professor: c.professor,
        }))}
        selectedCourse={selectedCourse}
        selectedProfessor={selectedProfessor}
      />
    );
  }

  let _class = await api.classes.getAll(
    classId ? { id: classId, limit: 1 } : { courseCode, section, limit: 1 },
  );
  if (_class.length === 0 && !classId && courseCode && section) {
    const fallback = await api.classes.getAll({
      courseCode,
      section,
      allowAnyTerm: true,
      limit: 1,
    });
    if (fallback.length > 0) {
      _class = fallback;
    }
  }
  if (_class.length === 0) {
    return (
      <div className="flex w-full max-w-5xl flex-col gap-6 pt-2">
        <EmptyState
          title="Class not found"
          description={
            "No class records found for " +
            (courseCode ?? "") +
            " " +
            (section ?? "") +
            ". Try exploring available courses."
          }
        />
      </div>
    );
  }
  const classInfo = _class[0]!;
  classId = classInfo.id;
  courseCode = classInfo.course.code;
  section = classInfo.section;
  const professorId = classInfo?.professor?.id;

  // Reference timings for timing-based section selection
  const referenceTimings =
    classInfo?.classTimings.map((t) => ({
      dayOfWeek: t.dayOfWeek,
      startTime: t.startTime,
    })) ?? [];

  const professors = await api.professors.getProfessorsByClassId({
    classId,
  });

  // SPEC-2: Single data source — course+professor matching when professor exists,
  // fall back to section-specific only when professor is null (TBA).
  const allBidResults = professorId
    ? selectOneClassPerTerm(
        await api.bidResults.getByCourseProfessor({
          courseCode,
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

  const [bidPrediction, safetyFactor, currentTerm] = await Promise.all([
    api.bidPredictions.getBy({ classId }),
    api.safetyFactors.getAll(),
    api.acadTerms.current(),
  ]);

  if (allBidResults.length === 0 && !bidPrediction) {
    return (
      <div className="flex w-full max-w-5xl flex-col gap-6 pt-2">
        <EmptyState
          title="No data available"
          description="Try a different course or section."
        />
      </div>
    );
  }

  return (
    <div
      className="flex w-full max-w-5xl flex-col gap-6 pt-2"
      data-test="bid-analytics-content"
    >
      {/* Class Info Summary Card — server rendered */}
      {classInfo && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            {/* SPEC-5: Course name as primary title */}
            <CardTitle className="text-xl">{classInfo.course.name}</CardTitle>
            {/* SPEC-5: Course code as subtitle */}
            <CardDescription>{classInfo.course.code}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 sm:px-6">
            {/* SPEC-5: Professor | Section | Grading Basis in 3-column grid */}
            <div className="grid grid-cols-3 gap-2 text-sm sm:gap-4">
              <div>
                <span className="text-muted-foreground text-xs sm:text-sm">
                  Professor
                </span>
                <p className="text-xs font-medium sm:text-sm">
                  {classInfo.professor?.name ?? "TBA"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs sm:text-sm">
                  Section
                </span>
                <p className="text-xs font-medium sm:text-sm">
                  {classInfo.section}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs sm:text-sm">
                  Grading Basis
                </span>
                <p className="text-xs font-medium sm:text-sm">
                  {classInfo.gradingBasis ?? "N/A"}
                </p>
              </div>
            </div>
            {/* Meeting Information Table — BOSS-style */}
            {(classInfo.classTimings.length > 0 ||
              classInfo.classExamTimings.some((t) => t.date)) && (
              <>
                <div className="w-full overflow-x-auto text-sm">
                  <table className="w-full table-fixed text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="w-[12%] py-1 pr-2 text-left font-medium sm:w-[15%] sm:pr-4">
                          Type
                        </th>
                        <th className="w-[24%] py-1 pr-2 text-left font-medium sm:w-[25%] sm:pr-4">
                          Day
                        </th>
                        <th className="w-[28%] py-1 pr-2 text-left font-medium sm:w-[24%] sm:pr-4">
                          Time
                        </th>
                        <th className="w-[36%] py-1 text-left font-medium sm:w-[36%]">
                          Venue
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {classInfo.classTimings.map((t, i) => (
                        <tr
                          key={`class-${i}`}
                          className="border-border/50 border-b"
                        >
                          <td className="py-1.5 pr-2 font-medium sm:pr-4">
                            Class
                          </td>
                          <td className="py-1.5 pr-2 sm:pr-4">{t.dayOfWeek}</td>
                          <td className="py-1.5 pr-2 font-mono whitespace-nowrap tabular-nums sm:pr-4">
                            {t.startTime}-{t.endTime}
                          </td>
                          {/* SPEC-5: Venue uses text-foreground for readability */}
                          <td className="text-foreground py-1.5 break-words">
                            {t.venue ?? "—"}
                          </td>
                        </tr>
                      ))}
                      {classInfo.classExamTimings
                        .filter((t) => t.date)
                        .map((t, i) => (
                          <tr
                            key={`exam-${i}`}
                            className="border-border/50 border-b"
                          >
                            <td className="py-1.5 pr-2 font-medium sm:pr-4">
                              Exam
                            </td>
                            <td className="py-1.5 pr-2 sm:pr-4">
                              <span className="whitespace-nowrap">
                                {formatDateSGT(t.date, {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <br />
                              <span>{t.dayOfWeek}</span>
                            </td>
                            <td className="py-1.5 pr-2 font-mono whitespace-nowrap tabular-nums sm:pr-4">
                              {t.startTime}-{t.endTime}
                            </td>
                            <td className="text-foreground py-1.5 break-words">
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
                  <p className="text-muted-foreground mt-1 text-sm italic">
                    No schedule data available
                  </p>
                </div>
              )}
            {/* Add to timetable action */}
            <div className="flex justify-end pt-2">
              <AddToTimetableButton
                classId={classInfo.id}
                acadTermId={classInfo.acadTermId}
                courseName={classInfo.course.name}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart + Filters + Table — client component */}
      <BidAnalyticsClient
        allBidResults={allBidResults}
        courseCode={courseCode}
        section={section}
        initialRounds={initialRounds}
        initialWindows={initialWindows}
        currentAcadTermId={currentTerm?.id}
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
        sessions={classInfo?.classTimings ?? []}
        courseCode={courseCode}
      />
    </div>
  );
}
