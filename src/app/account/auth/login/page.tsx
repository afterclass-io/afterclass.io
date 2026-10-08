import { type Metadata } from "next";
import { Suspense } from "react";

import { AuthCard, LoginForm } from "@/modules/auth/components";
import { isPasswordLoginEnabled } from "@/server/auth/password-login";

export const metadata: Metadata = {
  alternates: { canonical: "/account/auth/login" },
};

export default async function Login() {
  const enablePasswordLogin = await isPasswordLoginEnabled();
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
