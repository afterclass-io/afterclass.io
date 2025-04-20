"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/common/components/dialog";
import { informationCardTheme } from "./InformationCard.theme";
import { Button } from "@/common/components/button";

export const InformationModal = ({
  courseName,
  courseDesc,
}: {
  courseName: string;
  courseDesc: string;
}) => {
  const { modalHeader, modalBody } = informationCardTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="md:px-0"
          data-test="course-information-modal-trigger"
        >
          See more
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-prose"
        data-test="course-information-modal"
      >
        <DialogHeader className={modalHeader()}>{courseName}</DialogHeader>
        <div className={modalBody()} data-test="course-information-modal-body">
          {courseDesc}
        </div>
      </DialogContent>
    </Dialog>
  );
};
