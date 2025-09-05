import { Separator } from "@/common/components/separator";
import { api } from "@/common/tools/trpc/server";
import { ClassCard } from "@/modules/bidding/components/ClassCard";
import { Combobox } from "@/modules/bidding/components/Combobox";
import { texts } from "@/modules/bidding/constants";
import { type UniversityAbbreviation } from "@prisma/client";

export default async function BiddingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const school = "SMU" satisfies UniversityAbbreviation;
  const _searchParams = await searchParams;
  const courseCode = _searchParams.course;
  const profSlug = _searchParams.prof;
  const hasSearchParams = !!courseCode || !!profSlug;

  const [courses, professors] = await Promise.all([
    api.courses.getAllByUniAbbrv({ universityAbbrv: school }),
    api.professors.getAllByUniAbbrv({ universityAbbrv: school }),
  ]);


  const classes = await api.classes.getAll({
    courseCode: courseCode,
    profSlug: profSlug,
    limit: !hasSearchParams ? 6 : undefined,
    
  });

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-4 md:flex-row">
        <Combobox
          items={courses.map((course) => ({
            value: course.code,
            label: `${course.code} ${course.name}`,
          }))}
          queryStringKey="course"
          selectedValue={courseCode}
          placeholder={texts.COMBOBOX.PLACEHOLDER.course}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.course}
        />
        <Combobox
          items={professors.map((prof) => ({
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {classes.length > 0 ? (
          classes.map((c) => (
            <ClassCard
              key={c.id}
              classId={c.id}
              course={c.course}
              section={c.section}
              classTiming={c.classTimings}
              examTiming={c.classExamTimings}
              professor={c.professor}
            />
          ))
        ) : (
          <div className="col-span-2 text-center text-gray-500">
            No classes found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
