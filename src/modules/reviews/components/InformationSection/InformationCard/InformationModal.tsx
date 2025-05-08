"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/dialog";
import { Button } from "@/common/components/button";

export const InformationModal = ({
  courseName,
  courseDesc,
}: {
  courseName: string;
  courseDesc: string;
}) => {
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
        <DialogHeader>
          <DialogTitle>{courseName}</DialogTitle>
        </DialogHeader>
        <DialogBody
          className="text-muted-foreground wrap-anywhere whitespace-pre-wrap"
          data-test="course-information-modal-body"
        >
          {courseDesc}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
