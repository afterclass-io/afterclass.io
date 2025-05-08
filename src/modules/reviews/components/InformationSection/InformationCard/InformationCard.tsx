import { ClipboardIcon } from "@/common/components/icons";
import { InformationCardSkeleton } from "./InformationCardSkeleton";
import { InformationCardLoginButton } from "./InformationCardLoginButton";
import { InformationModal } from "./InformationModal";
import { Heading } from "@/common/components/heading";

export const InformationCard = ({
  courseDesc,
  children,
}: {
  courseDesc: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="bg-card flex w-full flex-col gap-3 rounded-2xl p-4 text-base md:gap-5 md:p-6">
      <div className="flex items-center gap-2 pl-1 text-lg md:gap-4 md:pl-0 md:text-2xl">
        <ClipboardIcon className="size-4 md:size-6" />
        <Heading as="h2">Information</Heading>
      </div>
      <div className="flex flex-col gap-2">
        <div
          className="text-muted-foreground line-clamp-5 leading-5 md:line-clamp-3"
          data-test="course-description"
        >
          {courseDesc}
        </div>
        {children}
      </div>
    </div>
  );
};

InformationCard.Skeleton = InformationCardSkeleton;
InformationCard.LoginButton = InformationCardLoginButton;
InformationCard.Modal = InformationModal;
