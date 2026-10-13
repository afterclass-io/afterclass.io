import { redirect } from "next/navigation";
import { AuthCard, ForgotPwdForm } from "@/modules/auth/components";
import { isPasswordLoginEnabled } from "@/server/auth/password-login";

export default async function ForgotPassword() {
  const enablePasswordLogin = await isPasswordLoginEnabled();
  if (!enablePasswordLogin) {
    redirect("/account/auth/login?notice=password-disabled");
  }
  return (
    <AuthCard title="Forgot your password?">
      <ForgotPwdForm />
    </AuthCard>
  );
}
