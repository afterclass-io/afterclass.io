import { GraduationCapIcon } from "@/common/components/icons";
import { notFound } from "next/navigation";
import { ReviewHeaderTitle } from "@/modules/reviews/components/ReviewHeaderTitle";
import { getProfessorBySlug } from "@/modules/reviews/functions/getProfessorBySlug";

export default async function ProfessorHeader(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
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
