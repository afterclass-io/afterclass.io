import { redirect } from "next/navigation";
import { AuthCard, ResetPasswordForm } from "@/modules/auth/components";
import { isPasswordLoginEnabled } from "@/server/auth/password-login";

export default async function ResetPassword() {
  const enablePasswordLogin = await isPasswordLoginEnabled();
  if (!enablePasswordLogin) {
    redirect("/account/auth/login?notice=password-disabled");
  }
  return (
    <AuthCard title="Reset Password">
      <ResetPasswordForm />
    </AuthCard>
  );
}
