import { type ComponentProps, type ReactNode } from "react";
import { PageTitle } from "@/common/components/page-title";
import { SchoolTag } from "@/common/components/tag-school";

type ReviewHeaderTitleProps = {
  icon: ReactNode;
  school: ComponentProps<typeof SchoolTag>["school"];
  children: string;
};

export const ReviewHeaderTitle = ({
  icon,
  school,
  children,
}: ReviewHeaderTitleProps) => {
  return (
    <div className="w-full">
      <PageTitle
        contentLeft={icon}
        contentRight={<SchoolTag school={school} />}
      >
        {children}
      </PageTitle>
    </div>
  );
};
