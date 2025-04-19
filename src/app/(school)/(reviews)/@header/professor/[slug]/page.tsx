import { api } from "@/common/tools/trpc/server";
import { GraduationCapIcon } from "@/common/components/icons";
import { PageTitle } from "@/common/components/PageTitle";
import { notFound } from "next/navigation";
import { SchoolTag } from "@/common/components/SchoolTag";

export default async function ProfessorHeader(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const professor = await api.professors.getBySlug({ slug: params.slug });
  if (!professor) {
    return notFound();
  }

  return (
    <div className="w-full">
      <PageTitle
        contentLeft={<GraduationCapIcon className="h-9 w-9" />}
        contentRight={<SchoolTag school={professor.belongToUniversity.abbrv} />}
      >
        {professor.name}
      </PageTitle>
    </div>
  );
}
