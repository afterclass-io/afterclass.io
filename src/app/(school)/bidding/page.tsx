import { type Metadata } from "next";

import { api } from "@/common/tools/trpc/server";
import { auth } from "@/server/auth";
import { canViewData } from "@/server/ecfg/public-data";
import { AuthWall } from "@/common/components/auth-wall";
import { BiddingEntryView } from "@/modules/bidding/components/BiddingEntryView";
import type { ComboboxOption } from "@/common/components/combobox";

// `course` and `prof` filter a view of this page, so they are dropped.
export const metadata: Metadata = {
  alternates: { canonical: "/bidding" },
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
        <AuthWall variant="full" feature="bidding history" />
      </div>
    );
  }

  const _searchParams = await searchParams;
  const courseCode = _searchParams.course;
  const profSlug = _searchParams.prof;

  const [classes, selectedCourseData, selectedProfData] = await Promise.all([
    api.classes.getAll({
      courseCode: courseCode,
      profSlug: profSlug,
      // No limit — class metadata is small (~200 bytes per class) and the
      // IntersectionObserver in BiddingClassList handles client-side pagination.
    }),
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
