import { api } from "@/common/tools/trpc/server";
import { ClassCard } from "@/modules/bidding/components/ClassCard";
import { Combobox } from "@/modules/bidding/components/Combobox";
import { texts } from "@/modules/bidding/constants";
import { type UniversityAbbreviation } from "@prisma/client";

export default async function BiddingPage() {
  // TODO: get school from user field, to be populated automatically on successful signup based on user's email domain
  const school = "SMU" satisfies UniversityAbbreviation;

  const [courses, professors, classes] = await Promise.all([
    api.courses.getAllByUniAbbrv({ universityAbbrv: school }),
    api.professors.getAllByUniAbbrv({ universityAbbrv: school }),
    api.classes.getAllByCourseId({
      courseId: "fa1e4a9a-7b26-4fc3-a78b-9fa53d1ee471",
    }),
  ]);
  return (
    <div className="flex-col justify-center">
      <div>
        <Combobox
          items={courses.map((course) => ({
            value: course.id,
            label: `${course.code} ${course.name}`,
          }))}
          placeholder={texts.COMBOBOX.PLACEHOLDER.course}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.course}
          // onSelectChange={field.onChange}
        />
        <Combobox
          items={professors.map((prof) => ({
            value: prof.id,
            label: prof.name,
          }))}
          placeholder={texts.COMBOBOX.PLACEHOLDER.professor}
          triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.professor}
          // onSelectChange={field.onChange}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.length > 0 &&
          classes.map((c) => (
            <ClassCard
              key={c.id}
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
