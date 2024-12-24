import { notFound } from "next/navigation";
import PhGraduationCapFill from "~icons/ph/graduation-cap-fill";

import { api } from "@/common/tools/trpc/server";
import { PageTitle } from "@/common/components/PageTitle";
import { SchoolTag } from "@/common/components/SchoolTag";

export default async function ProfessorHeader({
  params,
}: {
  params: { slug: string };
}) {
  const professor = await api.professors.getBySlug({ slug: params.slug });
  if (!professor) {
    return notFound();
  }

  return (
    <div className="w-full">
      <PageTitle
        contentLeft={<PhGraduationCapFill className="h-9 w-9" />}
        contentRight={<SchoolTag school={professor.belongToUniversity.abbrv} />}
      >
        {professor.name}
      </PageTitle>
    </div>
  );
}
