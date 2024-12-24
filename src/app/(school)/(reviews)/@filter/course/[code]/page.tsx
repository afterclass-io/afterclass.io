import { auth } from "@/server/auth";
import { FilterToggleSection } from "@/modules/reviews/components/FilterToggleSection";
import { api } from "@/common/tools/trpc/server";

import PhPencilFill from "~icons/ph/pencil-fill";
import PhBookBookmarkFill from "~icons/ph/book-bookmark-fill";

export default async function CourseFilter({
  params,
}: {
  params: { code: string };
}) {
  const session = await auth();
  if (!session) {
    return <FilterToggleSection filterType="professor" isLocked />;
  }
  const professorForThisCourse = await api.professors.getByCourseCode({
    code: params.code,
  });
  return (
    <FilterToggleSection
      filterType="professor"
      searchParamsName="professor"
      dataToFilter={professorForThisCourse.map((professor) => ({
        label: professor.name,
        value: professor.slug,
        filterStats: [
          { icon: <PhPencilFill />, stat: professor._count.reviews },
          { icon: <PhBookBookmarkFill />, stat: professor._count.classes },
        ],
      }))}
    />
  );
}
