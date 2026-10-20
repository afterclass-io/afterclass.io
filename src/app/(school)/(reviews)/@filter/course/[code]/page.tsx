import { ReviewType } from "@/generated/prisma/enums";

import { auth } from "@/server/auth";
import { canViewData } from "@/server/ecfg/public-data";
import { FilterToggleSection } from "@/modules/reviews/components/FilterToggleSection";
import { api } from "@/common/tools/trpc/server";
import { BooksIcon, PencilIcon } from "@/common/components/icons";

export default async function CourseFilter(props: {
  params: Promise<{ code: string }>;
}) {
  const params = await props.params;
  const session = await auth();
  if (!(await canViewData(session, "courses"))) return null;
  // The tabs list the professors who teach this course.
  if (!(await canViewData(session, "professors"))) {
    return <FilterToggleSection filterType={ReviewType.PROFESSOR} isLocked />;
  }
  // A review count is a review figure, so it needs `reviews`.
  const canViewReviews = await canViewData(session, "reviews");

  // assuming all course codes are uppercase
  const courseCode = params.code.toUpperCase();
  const professorForThisCourse = await api.professors.getByCourseCode({
    code: courseCode,
  });
  return (
    <FilterToggleSection
      filterType={ReviewType.PROFESSOR}
      searchParamsName="professor"
      dataToFilter={professorForThisCourse.map((professor) => ({
        label: professor.name,
        value: professor.slug,
        filterStats: [
          ...(canViewReviews
            ? [{ icon: <PencilIcon />, stat: professor._count.reviews }]
            : []),
          { icon: <BooksIcon />, stat: professor._count.classes },
        ],
      }))}
    />
  );
}
