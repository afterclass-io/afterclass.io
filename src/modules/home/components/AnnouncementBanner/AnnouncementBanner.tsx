"use client";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import PhX from "~icons/ph/x";

import { Button } from "@/common/components/Button";
import { env } from "@/env";
import { useEdgeConfigs } from "@/common/hooks";

const hasCloseRevertOldUiAtom = atomWithStorage(
  "hasCloseRevertOldUi",
  false,
  undefined,
  { getOnInit: true },
);

export const AnnouncementBanner = () => {
  const [isShown, setIsShown] = useState(false);
  const [hasClosed, setHasClosed] = useAtom(hasCloseRevertOldUiAtom);
  const edgeConfig = useEdgeConfigs();

  useEffect(() => {
    setIsShown(!hasClosed && edgeConfig.enableAnnouncementBanner);
  }, [edgeConfig, hasClosed]);

  const handleClose = () => {
    setIsShown(false);
    setHasClosed(true);
  };

  return (
    isShown && (
      <div className="sticky top-0">
        <div className="relative flex w-full items-center justify-center gap-6 bg-primary-dark p-2 text-xs md:gap-2 md:p-1 md:text-sm">
          <span className="flex flex-col gap-1 text-text-on-primary md:flex-row">
            <span>We have a new look!</span>
            <span>Missed the old AfterClass?</span>
          </span>
          <Button
            as="a"
            variant="link"
            className="inline-flex h-fit p-0 pb-[1px] font-bold text-text-on-primary underline hover:text-secondary-default md:h-fit md:p-0 md:text-sm"
            href={env.NEXT_PUBLIC_OLD_SITE_URL}
            external
            isResponsive
            data-umami-event="announcement-banner-revert-old-ui"
          >
            Bring me back
          </Button>
          <Button
            variant="ghost"
            className="absolute right-0 inline font-bold text-text-on-primary hover:bg-transparent hover:after:bg-transparent"
            iconLeft={<PhX className="h-4 w-4" />}
            aria-label="close"
            onClick={handleClose}
            data-umami-event="announcement-banner-revert-old-ui-close"
          />
        </div>
      </div>
    )
  );
};
