"use client";

import { usePathname } from "next/navigation";
import { ProgressLink } from "@/common/components/progress-link";

export const InformationCardLoginButton = () => {
  const pathname = usePathname();
  return (
    <ProgressLink
      variant="link"
      href={{
        pathname: "/account/auth/login",
        query: { callbackUrl: pathname },
      }}
    >
      Login
    </ProgressLink>
  );
};
