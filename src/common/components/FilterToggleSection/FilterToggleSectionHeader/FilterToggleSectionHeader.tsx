import { ReviewType } from "@prisma/client";

import Heading from "@/common/components/heading";
import {
  GraduationCapColoredIcon,
  BooksColoredIcon,
} from "@/common/components/icons";
import { filterToggleSectionTheme } from "../FilterToggleSection.theme";

export const FilterToggleSectionHeader = ({ type }: { type: ReviewType }) => {
  const { sectionHeader, headerIcon } = filterToggleSectionTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className={sectionHeader()}>
      {type === ReviewType.COURSE ? (
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
