import { api } from "@/common/tools/trpc/server";
import { notFound } from "next/navigation";
import { PageTitle } from "@/common/components/PageTitle";
import { BooksIcon } from "@/common/components/CustomIcon";
import { SchoolTag } from "@/common/components/SchoolTag";

export default async function CourseHeader(
  props: {
    params: Promise<{ code: string }>;
  }
) {
  const params = await props.params;
  const course = await api.courses.getByCourseCode({
    code: params.code.toUpperCase(),
  });
  if (!course) {
    return notFound();
  }
  return (
    <div className="w-full">
      <PageTitle
        contentLeft={<BooksIcon className="h-9 w-9 text-text-em-low" />}
        contentRight={<SchoolTag school={course.belongToUniversity.abbrv} />}
      >
        {course.name}
      </PageTitle>
    </div>
  );
}
