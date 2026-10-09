import { type Metadata } from "next";

import {
  ReviewType,
  type UniversityAbbreviation,
} from "@/generated/prisma/enums";

import { ConstrainedContainer } from "@/common/components/constrained-container";
import { SchoolTag } from "@/common/components/tag-school";
import { PageTitle } from "@/common/components/page-title";
import { api } from "@/common/tools/trpc/server";
import { toTitleCase } from "@/common/functions/toTitleCase";
import {
  ReviewForm,
  ReviewFormSection,
} from "@/modules/submit/components/ReviewForm";
import { auth, signIn } from "@/server/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SubmitReviewPage() {
  const session = await auth();
  if (!session) {
    return signIn(undefined, { redirectTo: "/submit" });
  }

  // TODO: get school from user field, to be populated automatically on successful signup based on user's email domain
  const school = "SMU" satisfies UniversityAbbreviation;

  const labels = await api.labels.getAll();

  return (
    <ConstrainedContainer className="flex flex-col space-y-5 md:space-y-8">
      <PageTitle contentRight={<SchoolTag school={school} />}>
        Write a Review
      </PageTitle>
      <ReviewForm>
        <ReviewFormSection
          reviewLabels={labels
            .filter((label) => label.typeOf === ReviewType.COURSE)
            .map((label) => ({
              value: label.id.toString(),
              label: toTitleCase(label.name.replaceAll("_", " ")),
            }))}
          maxRating={5}
          type="course"
        />
        <ReviewFormSection
          reviewLabels={labels
            .filter((label) => label.typeOf === ReviewType.PROFESSOR)
            .map((label) => ({
              value: label.id.toString(),
              label: toTitleCase(label.name.replaceAll("_", " ")),
            }))}
          maxRating={5}
          type="professor"
          isOptional
        />
      </ReviewForm>
    </ConstrainedContainer>
  );
}
