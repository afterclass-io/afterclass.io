import { ReviewLabelType } from "@prisma/client";

import Heading from "@/common/components/Heading";
import {
  GraduationCapColoredIcon,
  BooksColoredIcon,
} from "@/common/components/CustomIcon";
import { filterToggleSectionTheme } from "../FilterToggleSection.theme";

export const FilterToggleSectionHeader = ({
  type,
}: {
  type: ReviewLabelType;
}) => {
  const { sectionHeader, headerIcon } = filterToggleSectionTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className={sectionHeader()}>
      {type === ReviewLabelType.COURSE ? (
        <>
          <BooksColoredIcon className={headerIcon()} />
          <Heading as="h2">Courses</Heading>
        </>
      ) : (
        <>
          <GraduationCapColoredIcon className={headerIcon()} />
          <Heading as="h2">Professors</Heading>
        </>
      )}
    </div>
  );
};
