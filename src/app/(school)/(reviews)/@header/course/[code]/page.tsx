import { notFound } from "next/navigation";
import { BooksIcon } from "@/common/components/icons";
import { ReviewHeaderTitle } from "@/modules/reviews/components/ReviewHeaderTitle";
import { getCourseByCode } from "@/modules/reviews/functions/getCourseByCode";

export default async function CourseHeader(props: {
  params: Promise<{ code: string }>;
}) {
  const params = await props.params;
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
