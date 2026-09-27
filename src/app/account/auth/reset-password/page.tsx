import { redirect } from "next/navigation";
import { AuthCard, ResetPasswordForm } from "@/modules/auth/components";
import { getEdgeConfig } from "@/common/providers/EdgeConfig/EdgeConfigProvider";

export default async function ResetPassword() {
  const ecfg = await getEdgeConfig().catch(() => null);
  const isDev = process.env.NODE_ENV === "development";
  const enablePasswordLogin =
    (isDev && process.env.ENABLE_PASSWORD_LOGIN !== "false") ||
    (ecfg?.enablePasswordLogin ?? false);
  if (!enablePasswordLogin) {
    redirect("/account/auth/login?notice=password-disabled");
  }
  return (
    <AuthCard title="Reset Password">
      <ResetPasswordForm />
    </AuthCard>
  );
}
