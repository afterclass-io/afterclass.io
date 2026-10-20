import { notFound } from "next/navigation";
import { AuthWall } from "@/common/components/auth-wall";
import { BooksIcon } from "@/common/components/icons";
import { ReviewHeaderTitle } from "@/modules/reviews/components/ReviewHeaderTitle";
import { getCourseByCode } from "@/modules/reviews/functions/getCourseByCode";
import { auth } from "@/server/auth";
import { canViewData } from "@/server/ecfg/public-data";

export default async function CourseHeader(props: {
  params: Promise<{ code: string }>;
}) {
  const params = await props.params;
  // The other slots render nothing when `courses` is private, so the wall is shown once, here.
  if (!(await canViewData(await auth(), "courses"))) {
    return <AuthWall variant="full" feature="course pages" />;
  }
  const course = await getCourseByCode(params.code.toUpperCase());
  if (!course) {
    return notFound();
  }
  return (
    <ReviewHeaderTitle
      icon={<BooksIcon className="text-muted-foreground h-9 w-9" />}
      school={course.belongToUniversity.abbrv}
    >
      {course.name}
    </ReviewHeaderTitle>
  );
}
