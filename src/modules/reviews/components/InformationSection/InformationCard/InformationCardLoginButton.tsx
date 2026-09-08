"use client";

import { usePathname } from "next/navigation";
import { ProgressLink } from "@/common/components/progress-link";

export const InformationCardLoginButton = () => {
  const pathname = usePathname();
  const href = pathname
    ? `/account/auth/login?callbackUrl=${encodeURIComponent(pathname)}`
    : "/account/auth/login";

  return (
    <ProgressLink
      variant="link"
      href={href}
    >
      Login
    </ProgressLink>
  );
};
