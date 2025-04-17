import { emailValidationSchema } from "@/common/tools/zod/schemas";
import {
  AuthCard,
  SignupForm,
  ResetV1UserAlertDialog,
} from "@/modules/auth/components";

export default async function SignUp(
  props: {
    searchParams: Promise<{ email: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const { success: isValidEmail, data: v1Email } =
    emailValidationSchema.safeParse(searchParams?.email);

  return (
    <>
      {isValidEmail && <ResetV1UserAlertDialog />}
      <AuthCard title="Create an account">
        <SignupForm defaultEmail={v1Email} />
      </AuthCard>
    </>
  );
}
