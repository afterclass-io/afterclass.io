import { api } from "@/common/tools/trpc/server";
import { detailCardTheme } from "./DetailCard.theme";
import { DetailCardSkeleton } from "./DetailCardSkeleton";
import type { getByCourseCodeResolved } from "@/server/api/courses/getByCourseCode";

interface Props {
  course: NonNullable<getByCourseCodeResolved>;
}

export const DetailCard = async ({ course }: Props) => {
  const { wrapper, header, body, content, field, value } = detailCardTheme({
    size: { initial: "sm", md: "md" },
  });

  const classes = await api.classes.getAllByCourseId({
    courseId: course.id,
  });

  let latestClass;
  if (classes.length > 0) {
    latestClass = classes[0];
  }

  return (
    <div className={wrapper()}>
      <div className={header()}>
        <p>Details</p>
      </div>
      <div className={body()}>
        <div className={content()}>
          <p className={field()}>Course code:</p>
          <p className={value()} data-test="course-code">
            {course.code}
          </p>
        </div>
        <div className={content()}>
          <p className={field()}>Credit unit:</p>
          <p className={value()} data-test="course-credit">
            {course.creditUnits}
          </p>
        </div>
        {latestClass?.courseOutlineUrl && (
          <div className={content()}>
            <a
              className="font-medium text-text-em-mid underline"
              href={latestClass.courseOutlineUrl}
              target="_blank"
            >
              Course Description
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

DetailCard.Skeleton = DetailCardSkeleton;
