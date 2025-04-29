import Link from "next/link";
import { api } from "@/common/tools/trpc/server";
import type { getByCourseCodeResolved } from "@/server/api/courses/getByCourseCode";
import { Button } from "@/common/components/button";
import { Heading } from "@/common/components/heading";
import { DetailCardSkeleton } from "./DetailCardSkeleton";

interface Props {
  course: NonNullable<getByCourseCodeResolved>;
}

export const DetailCard = async ({ course }: Props) => {
  const classes = await api.classes.getAllByCourseId({
    courseId: course.id,
  });

  let latestClass;
  if (classes.length > 0) {
    latestClass = classes[0];
  }

  return (
    <div className="bg-card flex h-full w-full flex-col gap-3 rounded-2xl p-4 text-base md:gap-5 md:p-6">
      <Heading as="h2" className="text-lg md:text-2xl">
        Details
      </Heading>
      <div className="flex flex-col gap-1 md:gap-3">
        <div className="flex gap-2 font-medium md:gap-3 md:text-lg">
          <p className="text-muted-foreground">Course code:</p>
          <p className="text-card-foreground" data-test="course-code">
            {course.code}
          </p>
        </div>
        <div className="flex gap-2 font-medium md:gap-3 md:text-lg">
          <p className="text-muted-foreground">Credit unit:</p>
          <p className="text-card-foreground" data-test="course-credit">
            {course.creditUnits}
          </p>
        </div>
        {latestClass?.courseOutlineUrl && (
          <div className="flex gap-2 font-medium md:gap-3 md:text-lg">
            <Button asChild variant="link" className="size-fit p-0">
              <Link href={latestClass.courseOutlineUrl} target="_blank">
                Course Description
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

DetailCard.Skeleton = DetailCardSkeleton;
