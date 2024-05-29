import { api } from "@/common/tools/trpc/server";
import { notFound } from "next/navigation";
import { InformationCard } from "@/modules/reviews/InformationSection/InformationCard";
import { getServerAuthSession } from "@/server/auth";

export default async function CourseInfo({
  params,
}: {
  params: { code: string };
}) {
  const session = await getServerAuthSession();
  const course = await api.courses.getByCourseCode({
    code: params.code.toUpperCase(),
  });
  if (!course) {
    return notFound();
  }
  return (
    <div className="flex w-full gap-6">
      <div className="w-2/3">
        <InformationCard courseDesc={course.description}>
          {!session ? (
            <InformationCard.LoginButton />
          ) : (
            <InformationCard.Modal
              courseName={course.name}
              courseDesc={course.description}
            />
          )}
        </InformationCard>
      </div>
      <div className="w-1/3">TODO: course detail</div>
    </div>
  );
}
