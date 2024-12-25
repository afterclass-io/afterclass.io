"use client";
import { usePathname } from "next/navigation";

import { ProgressLink } from "@/common/components/Progress";

export const CoreLayoutLoginButton = () => {
  const pathname = usePathname();
  return (
    <ProgressLink
      variant="secondary"
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
