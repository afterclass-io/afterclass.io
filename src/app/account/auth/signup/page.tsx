import { type Metadata } from "next";

import { emailValidationSchema } from "@/common/tools/zod/schemas";
import {
  AuthCard,
  SignupForm,
  ResetV1UserAlertDialog,
} from "@/modules/auth/components";

// `email` pre-fills the form, it does not name a distinct page.
export const metadata: Metadata = {
  alternates: { canonical: "/account/auth/signup" },
};

export default async function SignUp(props: {
  searchParams: Promise<{ email: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const { success: isValidEmail, data: v1Email } =
    emailValidationSchema.safeParse(searchParams?.email);

  return (
    <>
      {isValidEmail && <ResetV1UserAlertDialog />}
      <AuthCard title="Create an Account">
        <SignupForm defaultEmail={v1Email} />
      </AuthCard>
    </>
  );
}
