import { type Metadata } from "next";
import { Suspense } from "react";

import { Separator } from "@/common/components/separator";
import { api } from "@/common/tools/trpc/server";
import { BiddingClassList } from "@/modules/bidding/components/BiddingClassList";
import { CourseProfessorFilter } from "@/modules/bidding/components/CourseProfessorFilter";
import type { ComboboxOption } from "@/common/components/combobox";

// `course` and `prof` filter a view of this page, so they are dropped.
export const metadata: Metadata = {
  alternates: { canonical: "/bidding" },
};

export default async function BiddingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
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
    <div className="flex flex-col gap-6 pt-2">
      <Suspense>
        <CourseProfessorFilter
          selectedCourse={selectedCourse}
          selectedProfessor={selectedProfessor}
        />
      </Suspense>
      <Separator />
      <BiddingClassList
        initialClasses={classes.map((c) => ({
          id: c.id,
          section: c.section,
          course: c.course,
          classTimings: c.classTimings,
          classExamTimings: c.classExamTimings,
          professor: c.professor,
        }))}
      />
    </div>
  );
}
