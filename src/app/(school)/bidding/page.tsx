import { Separator } from "@/common/components/separator";
import { api } from "@/common/tools/trpc/server";
import { BiddingClassList } from "@/modules/bidding/components/BiddingClassList";
import { Combobox } from "@/modules/bidding/components/Combobox";
import { texts } from "@/modules/bidding/constants";
import type { UniversityAbbreviation } from "@/generated/prisma/client";

export default async function BiddingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const school = "SMU" satisfies UniversityAbbreviation;
  const _searchParams = await searchParams;
  const courseCode = _searchParams.course;
  const profSlug = _searchParams.prof;

  const [courses, professors] = await Promise.all([
    api.courses.getAllByUniAbbrv({ universityAbbrv: school }),
    api.professors.getAllByUniAbbrv({ universityAbbrv: school }),
  ]);

  const classes = await api.classes.getAll({
    courseCode: courseCode,
    profSlug: profSlug,
    // No limit — class metadata is small (~200 bytes per class) and the
    // IntersectionObserver in BiddingClassList handles client-side pagination.
  });

  // Bidirectional scoping: when a course is selected, only show professors
  // teaching that course. When a professor is selected, only show courses
  // taught by that professor. Both derived from the existing `classes` query.
  const filteredProfessors = courseCode
    ? professors.filter((p) =>
        classes.some((c) => c.professor?.slug === p.slug),
      )
    : professors;

  const filteredCourses = profSlug
    ? courses.filter((co) => classes.some((c) => c.course.code === co.code))
    : courses;

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-4 md:flex-row">
        <Combobox
          items={filteredCourses.map((course) => ({
            value: course.code,
            label: `${course.code} ${course.name}`,
          }))}
          queryStringKey="course"
          selectedValue={courseCode}
          placeholder={texts.COMBOBOX.PLACEHOLDER.course}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.course}
        />
        <Combobox
          items={filteredProfessors.map((prof) => ({
            value: prof.slug,
            label: prof.name,
          }))}
          queryStringKey="prof"
          selectedValue={profSlug}
          placeholder={texts.COMBOBOX.PLACEHOLDER.professor}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.professor}
        />
      </div>
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
