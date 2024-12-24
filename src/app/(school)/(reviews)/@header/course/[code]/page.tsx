import { notFound } from "next/navigation";

import PhBookBookmarkFill from "~icons/ph/book-bookmark-fill";

import { api } from "@/common/tools/trpc/server";
import { PageTitle } from "@/common/components/PageTitle";
import { SchoolTag } from "@/common/components/SchoolTag";

export default async function CourseHeader({
  params,
}: {
  params: { code: string };
}) {
  const course = await api.courses.getByCourseCode({
    code: params.code.toUpperCase(),
  });
  if (!course) {
    return notFound();
  }
  return (
    <div className="w-full">
      <PageTitle
        contentLeft={
          <PhBookBookmarkFill className="h-9 w-9 text-text-em-low" />
        }
        contentRight={<SchoolTag school={course.belongToUniversity.abbrv} />}
      >
        {course.name}
      </PageTitle>
    </div>
  );
}
