import { api } from "@/common/tools/trpc/server";
import { ClassCard } from "@/modules/bidding/components/ClassCard";
import { Combobox } from "@/modules/bidding/components/Combobox";
import { texts } from "@/modules/bidding/constants";
import { type UniversityAbbreviation } from "@prisma/client";

export default async function BiddingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // TODO: get school from user field, to be populated automatically on successful signup based on user's email domain
  const school = "SMU" satisfies UniversityAbbreviation;

  const courseCode = (await searchParams).course;
  const profSlug = (await searchParams).professor;

  const [courses, professors] = await Promise.all([
    api.courses.getAllByUniAbbrv({ universityAbbrv: school }),
    api.professors.getAllByUniAbbrv({ universityAbbrv: school }),
  ]);

  return (
    <div className="flex-col justify-center">
      <div>
        <Combobox
          items={courses.map((course) => ({
            value: course.code,
            label: `${course.code} ${course.name}`,
          }))}
          queryStringKey="course"
          placeholder={texts.COMBOBOX.PLACEHOLDER.course}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.course}
        />
        <Combobox
          items={professors.map((prof) => ({
            value: prof.slug,
            label: prof.name,
          }))}
          queryStringKey="prof"
          placeholder={texts.COMBOBOX.PLACEHOLDER.professor}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.professor}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.length > 0 &&
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
          ))}
      </div>
    </div>
  );
}
