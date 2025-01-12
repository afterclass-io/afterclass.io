import { auth } from "@/server/auth";
import { FilterToggleSection } from "@/modules/reviews/components/FilterToggleSection";
import { api } from "@/common/tools/trpc/server";
import { BooksIcon, PencilIcon } from "@/common/components/CustomIcon";

export default async function CourseFilter({
  params,
}: {
  params: { code: string };
}) {
  const session = await auth();
  if (!session) {
    return <FilterToggleSection filterType="professor" isLocked />;
  }

  // assuming all course codes are uppercase
  const courseCode = params.code.toUpperCase();
  const professorForThisCourse = await api.professors.getByCourseCode({
    code: courseCode,
  });
  return (
    <FilterToggleSection
      filterType="professor"
      searchParamsName="professor"
      dataToFilter={professorForThisCourse.map((professor) => ({
        label: professor.name,
        value: professor.slug,
        filterStats: [
          { icon: <PencilIcon />, stat: professor._count.reviews },
          { icon: <BooksIcon />, stat: professor._count.classes },
        ],
      }))}
    />
  );
}
