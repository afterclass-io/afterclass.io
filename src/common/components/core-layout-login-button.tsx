"use client";
import { usePathname } from "next/navigation";

import { ProgressLink } from "@/common/components/progress-link";

export const CoreLayoutLoginButton = () => {
  const pathname = usePathname();
  return (
    <ProgressLink
      href={{
        pathname: "/account/auth/login",
        query: { callbackUrl: pathname },
      }}
      data-test="login"
    >
      Login
    </ProgressLink>
  );
};
