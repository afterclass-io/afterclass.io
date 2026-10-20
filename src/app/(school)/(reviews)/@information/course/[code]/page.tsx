import { notFound } from "next/navigation";
import { InformationCard } from "@/modules/reviews/components/InformationSection/InformationCard";
import { DetailCard } from "@/modules/reviews/components/InformationSection/DetailCard";
import { getCourseByCode } from "@/modules/reviews/functions/getCourseByCode";
import { auth } from "@/server/auth";
import { canViewData } from "@/server/ecfg/public-data";

export default async function CourseInfo(props: {
  params: Promise<{ code: string }>;
}) {
  const params = await props.params;
  const session = await auth();
  if (!(await canViewData(session, "courses"))) return null;

  const course = await getCourseByCode(params.code.toUpperCase());

  if (!course) {
    return notFound();
  }
  const canViewClassData = await canViewData(session, "classData");

  return (
    <div className="grid w-full grid-cols-25 gap-4 md:gap-6">
      <div className="col-span-25 md:col-span-16">
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
      <div className="col-span-25 md:col-span-9">
        <DetailCard course={course} canViewClassData={canViewClassData} />
      </div>
    </div>
  );
}
