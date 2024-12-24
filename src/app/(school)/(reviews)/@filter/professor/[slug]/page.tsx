import PhPencilFill from "~icons/ph/pencil-fill";
import PhGraduationCapFill from "~icons/ph/graduation-cap-fill";

import { FilterToggleSection } from "@/modules/reviews/components/FilterToggleSection";
import { api } from "@/common/tools/trpc/server";
import { auth } from "@/server/auth";

export default async function ProfessorFilter({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth();
  if (!session) {
    return <FilterToggleSection filterType="course" isLocked />;
  }

  const coursesTaughtByThisProf = await api.courses.getByProfSlug({
    slug: params.slug,
  });

  return (
    <FilterToggleSection
      filterType="course"
      searchParamsName="course"
      dataToFilter={coursesTaughtByThisProf.map((course) => ({
        label: course.name,
        sublabel: course.code,
        value: course.code,
        filterStats: [
          { icon: <PhPencilFill />, stat: course._count.reviews },
          { icon: <PhGraduationCapFill />, stat: course._count.classes },
        ],
      }))}
    />
  );
}
