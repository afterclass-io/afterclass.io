import { Suspense } from "react";

import { AuthCard, LoginForm } from "@/modules/auth/components";
import { getEdgeConfig } from "@/common/providers/EdgeConfig/EdgeConfigProvider";

export default async function Login() {
  const ecfg = await getEdgeConfig().catch(() => null);
  const isDev = process.env.NODE_ENV === "development";
  const enablePasswordLogin =
    (isDev && process.env.ENABLE_PASSWORD_LOGIN !== "false") ||
    (ecfg?.enablePasswordLogin ?? false);
  return (
    <AuthCard title="Login">
      {/*
          //! suspense required for useSearchParams
          see https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
      */}
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm enablePasswordLogin={enablePasswordLogin} />
      </Suspense>
    </AuthCard>
  );
}
