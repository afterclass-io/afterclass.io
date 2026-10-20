import { AuthWall } from "@/common/components/auth-wall";
import { GraduationCapIcon } from "@/common/components/icons";
import { notFound } from "next/navigation";
import { ReviewHeaderTitle } from "@/modules/reviews/components/ReviewHeaderTitle";
import { getProfessorBySlug } from "@/modules/reviews/functions/getProfessorBySlug";
import { auth } from "@/server/auth";
import { canViewData } from "@/server/ecfg/public-data";

export default async function ProfessorHeader(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  // The other slots render nothing when `professors` is private, so the wall is shown once, here.
  if (!(await canViewData(await auth(), "professors"))) {
    return <AuthWall variant="full" feature="professor pages" />;
  }
  const professor = await getProfessorBySlug(params.slug);
  if (!professor) {
    return notFound();
  }

  return (
    <ReviewHeaderTitle
      icon={<GraduationCapIcon className="h-9 w-9" />}
      school={professor.belongToUniversity.abbrv}
    >
      {professor.name}
    </ReviewHeaderTitle>
  );
}
