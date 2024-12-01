"use client";
import { useEffect, useState } from "react";

import { XCloseIcon } from "@/common/components/CustomIcon";
import { Button } from "@/common/components/Button";
import { env } from "@/env";

export const AnnouncementsBanner = () => {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsShown(!localStorage.getItem("show_revert_old_ui"));
    }
  }, []);

  const handleClose = () => {
    setIsShown(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("show_revert_old_ui", "true");
    }
  };

  return (
    isShown && (
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
        >
          Bring me back
        </Button>
        <Button
          variant="ghost"
          className="absolute right-0 inline font-bold text-text-on-primary hover:bg-transparent hover:after:bg-transparent"
          iconLeft={<XCloseIcon className="h-4 w-4" />}
          aria-label="close"
          onClick={handleClose}
        />
      </div>
    )
  );
};
