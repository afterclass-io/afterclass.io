"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import { CtaButton } from "@/common/components/cta-button";

function ReviewCtaButtonsInner() {
  const searchParams = useSearchParams();
  const courseCode = searchParams.get("course");
  const profSlug = searchParams.get("prof");
  const classId = searchParams.get("classId");

  const { data: classData } = api.classes.getAll.useQuery(
    { id: classId ?? undefined, limit: 1 },
    { enabled: !!classId },
  );

  const { data: profData } = api.professors.getBySlug.useQuery(
    { slug: profSlug! },
    { enabled: !!profSlug },
  );

  if (!courseCode) return null;

  const classInfo = classData?.[0];

  // Professor from URL param (prof=) takes precedence, then from class lookup.
  // TBA classes (no professor) won't have a slug → button hidden.
  const professorSlug = profSlug || classInfo?.professor?.slug;
  const professorName = profData?.name ?? classInfo?.professor?.name;

  return (
    <>
      <CtaButton
        variant="outline"
        ctaText="Course Reviews"
        subtext={courseCode}
        className="text-muted-foreground bg-card/80"
        href={`/course/${courseCode}`}
        iconLeft={<BookOpen />}
        data-umami-event="nav-course-reviews-sidebar"
      />
      {professorSlug && (
        <CtaButton
          variant="outline"
          ctaText="Professor Reviews"
          subtext={professorName}
          className="text-muted-foreground bg-card/80"
          href={`/professor/${professorSlug}`}
          iconLeft={<GraduationCap />}
          data-umami-event="nav-professor-reviews-sidebar"
        />
      )}
    </>
  );
}

export const ReviewCtaButtons = () => (
  <Suspense fallback={null}>
    <ReviewCtaButtonsInner />
  </Suspense>
);
