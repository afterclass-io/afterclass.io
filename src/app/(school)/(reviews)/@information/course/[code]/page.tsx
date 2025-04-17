import { api } from "@/common/tools/trpc/server";
import { notFound } from "next/navigation";
import { InformationCard } from "@/modules/reviews/components/InformationSection/InformationCard";
import { DetailCard } from "@/modules/reviews/components/InformationSection/DetailCard";
import { auth } from "@/server/auth";

export default async function CourseInfo(
  props: {
    params: Promise<{ code: string }>;
  }
) {
  const params = await props.params;
  const session = await auth();
  const course = await api.courses.getByCourseCode({
    code: params.code.toUpperCase(),
  });

  if (!course) {
    return notFound();
  }

  return (
    <div className="flex w-full flex-wrap gap-4 md:flex-nowrap md:gap-6">
      <div className="w-full md:w-2/3">
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
      <div className="w-full md:w-1/3">
        <DetailCard course={course} />
      </div>
    </div>
  );
}
