import { ReviewType } from "@/generated/prisma/enums";
import { auth } from "@/server/auth";
import { canViewData } from "@/server/ecfg/public-data";
import { FilterToggleSection } from "@/modules/reviews/components/FilterToggleSection";
import { GraduationCapIcon, PencilIcon } from "@/common/components/icons";
import { api } from "@/common/tools/trpc/server";

export default async function ProfessorFilter(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const session = await auth();
  if (!(await canViewData(session, "professors"))) return null;
  // The tabs list the courses this professor teaches.
  if (!(await canViewData(session, "courses"))) {
    return <FilterToggleSection filterType={ReviewType.COURSE} isLocked />;
  }
  // A review count is a review figure, so it needs `reviews`.
  const canViewReviews = await canViewData(session, "reviews");

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
          ...(canViewReviews
            ? [{ icon: <PencilIcon />, stat: course._count.reviews }]
            : []),
          { icon: <GraduationCapIcon />, stat: course._count.classes },
        ],
      }))}
    />
  );
}
