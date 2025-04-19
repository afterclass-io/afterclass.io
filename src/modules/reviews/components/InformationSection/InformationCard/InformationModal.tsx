"use client";

import { Modal } from "@/common/components/Modal";
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
    <Modal overflow="inside">
      <Modal.Trigger asChild>
        <Button
          variant="link"
          isResponsive
          className="md:px-0"
          data-test="course-information-modal-trigger"
        >
          See more
        </Button>
      </Modal.Trigger>
      <Modal.Content
        className="max-w-prose"
        data-test="course-information-modal"
      >
        <Modal.Header className={modalHeader()}>{courseName}</Modal.Header>
        <Modal.Body
          className={modalBody()}
          data-test="course-information-modal-body"
        >
          {courseDesc}
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};
