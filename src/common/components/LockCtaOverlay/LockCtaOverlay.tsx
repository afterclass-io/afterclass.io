"use client";

import { usePathname } from "next/navigation";
import PhLockSimple from "~icons/ph/lock-simple";

import { Button } from "@/common/components/Button";
import {
  lockCtaOverlayTheme,
  type LockCtaOverlayVariants,
} from "./LockCtaOverlay.theme";

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
      <Button
        className={wrapper()}
        as="a"
        href={{
          pathname: "/account/auth/login",
          query: { callbackUrl: pathname },
        }}
        variant="ghost"
        asChild
        data-test="lock-cta-overlay"
      >
        <PhLockSimple className={icon()} />
        <div className={ctaTextContainer()}>
          <Button variant="link">Login</Button>
          <span>{ctaTextMap[ctaType]}</span>
        </div>
      </Button>
    </>
  );
};
