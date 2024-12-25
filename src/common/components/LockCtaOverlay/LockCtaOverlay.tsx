"use client";

import { usePathname } from "next/navigation";

import { Button } from "@/common/components/Button";
import { LockIcon } from "@/common/components/CustomIcon/LockIcon";
import {
  lockCtaOverlayTheme,
  type LockCtaOverlayVariants,
} from "./LockCtaOverlay.theme";
import { ProgressLink } from "@/common/components/Progress";

const ctaTextMap = {
  rating: "to see rating",
  review: "to see review",
} as const;

export type LockCtaOverlayProps = LockCtaOverlayVariants & {
  ctaType?: keyof typeof ctaTextMap;
};

export const LockCtaOverlay = ({
  variant,
  size = "md",
  ctaType = "rating",
}: LockCtaOverlayProps) => {
  const pathname = usePathname();
  const { wrapper, overlay, ctaTextContainer, icon } = lockCtaOverlayTheme({
    variant,
    size,
  });
  return (
    <>
      <div className={overlay()}></div>
      <ProgressLink
        href={{
          pathname: "/account/auth/login",
          query: { callbackUrl: pathname },
        }}
        className={wrapper()}
        variant="ghost"
        asChild
        data-test="lock-cta-overlay"
      >
        <LockIcon className={icon()} />
        <div className={ctaTextContainer()}>
          <Button variant="link">Login</Button>
          <span>{ctaTextMap[ctaType]}</span>
        </div>
      </ProgressLink>
    </>
  );
};
