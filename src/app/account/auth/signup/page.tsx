import { redirect } from "next/navigation";
import { emailValidationSchema } from "@/common/tools/zod/schemas";
import { getEdgeConfig } from "@/common/providers/EdgeConfig/EdgeConfigProvider";
import {
  AuthCard,
  SignupForm,
  ResetV1UserAlertDialog,
} from "@/modules/auth/components";

export default async function SignUp(props: {
  searchParams: Promise<{ email: string | string[] | undefined }>;
}) {
  const ecfg = await getEdgeConfig().catch(() => null);
  const isDev = process.env.NODE_ENV === "development";
  const enablePasswordLogin = isDev
    ? process.env.ENABLE_PASSWORD_LOGIN !== "false"
    : (ecfg?.enablePasswordLogin ?? false);
  if (!enablePasswordLogin) {
    redirect("/account/auth/login");
  }
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
