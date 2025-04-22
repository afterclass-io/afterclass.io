"use client";

import { usePathname } from "next/navigation";

import { LockIcon } from "@/common/components/icons";
import { ProgressLink } from "@/common/components/progress-link";

const ctaTextMap = {
  rating: "to see rating",
  review: "to see review",
} as const;

export type LockedOverlayProps = {
  ctaType?: keyof typeof ctaTextMap;
};

export const LockedOverlay = ({ ctaType = "rating" }: LockedOverlayProps) => {
  const pathname = usePathname();

  return (
    <>
      <div className="bg-card absolute top-0 left-0 h-full w-full shrink-0 rounded-[inherit] opacity-95 backdrop-blur-[100px]"></div>
      <ProgressLink
        href={{
          pathname: "/account/auth/login",
          query: { callbackUrl: pathname },
        }}
        className="text-muted-foreground hover:text-primary absolute top-0 left-0 z-10 inline-flex h-full w-full items-center justify-center"
        variant="ghost"
        data-test="lock-cta-overlay"
      >
        <LockIcon />
        <div className="flex items-center gap-1 font-medium">
          <span className="text-primary">Login</span>
          <span>{ctaTextMap[ctaType]}</span>
        </div>
      </ProgressLink>
    </>
  );
};
