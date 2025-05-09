import { ReviewType } from "@prisma/client";
import { auth } from "@/server/auth";
import { FilterToggleSection } from "@/modules/reviews/components/FilterToggleSection";
import { GraduationCapIcon, PencilIcon } from "@/common/components/icons";
import { api } from "@/common/tools/trpc/server";

export default async function ProfessorFilter(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const session = await auth();
  if (!session) {
    return <FilterToggleSection filterType={ReviewType.COURSE} isLocked />;
  }

  const coursesTaughtByThisProf = await api.courses.getByProfSlug({
    slug: params.slug,
  });

  return (
    <FilterToggleSection
      filterType={ReviewType.COURSE}
      searchParamsName="course"
      dataToFilter={coursesTaughtByThisProf.map((course) => ({
        label: course.name,
        sublabel: course.code,
        value: course.code,
        filterStats: [
          { icon: <PencilIcon />, stat: course._count.reviews },
          { icon: <GraduationCapIcon />, stat: course._count.classes },
        ],
      }))}
    />
  );
}
