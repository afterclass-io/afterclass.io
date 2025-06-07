import { AvailableSectionContainer } from "@/app/(school)/bidding/course/[code]/components/available-section";
import { CourseProvider } from "@/app/(school)/bidding/course/[code]/contexts/course";
import { Skeleton } from "@/common/components/skeleton";

interface CoursePageProps {
  params: Promise<{ code: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const courseCode = (await params).code;

  return (
    <CourseProvider intitialCourseCode={courseCode}>
      <Skeleton className="h-[400px] w-[600px]" />

      <AvailableSectionContainer />
    </CourseProvider>
  );
}
