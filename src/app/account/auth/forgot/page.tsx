import { redirect } from "next/navigation";
import { AuthCard, ForgotPwdForm } from "@/modules/auth/components";
import { getEdgeConfig } from "@/common/providers/EdgeConfig/EdgeConfigProvider";

export default async function ForgotPassword() {
  const ecfg = await getEdgeConfig().catch(() => null);
  const isDev = process.env.NODE_ENV === "development";
  const enablePasswordLogin =
    (isDev && process.env.ENABLE_PASSWORD_LOGIN !== "false") ||
    (ecfg?.enablePasswordLogin ?? false);
  if (!enablePasswordLogin) {
    redirect("/account/auth/login?notice=password-disabled");
  }
  return (
    <AuthCard title="Forgot your password?">
      <ForgotPwdForm />
    </AuthCard>
  );
}
