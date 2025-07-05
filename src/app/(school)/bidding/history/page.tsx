import { api } from "@/common/tools/trpc/server";
import { Combobox } from "@/modules/bidding/components/Combobox";
import { texts } from "@/modules/submit/constants";
import { type UniversityAbbreviation } from "@prisma/client";

export default async function BiddingHistoryPage() {
  // TODO: get school from user field, to be populated automatically on successful signup based on user's email domain
  const school = "SMU" satisfies UniversityAbbreviation;

  // const { data: courses, isLoading } = api.courses.getAllByUniAbbrv.useQuery({
  //   universityAbbrv: school,
  // });
  // if (isLoading) {
  //   return <div>Loading...</div>;
  // }
  const courses = await api.courses.getAllByUniAbbrv({
    universityAbbrv: school,
  });
  return (
    <div className="flex justify-center">
      <Combobox
        items={courses.map((course) => ({
          value: course.id,
          label: `${course.code} ${course.name}`,
        }))}
        placeholder={texts.COMBOBOX.PLACEHOLDER.course}
        triggerLabel={texts.COMBOBOX.TRIGGER_LABEL.course}
        // onSelectChange={field.onChange}
      />
    </div>
  );
}
