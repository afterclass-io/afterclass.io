import Heading from "@/common/components/Heading";
import { filterToggleSectionTheme } from "../FilterToggleSection.theme";

import TwemojiBlueBook from "~icons/twemoji/blue-book";
import TwemojiGraduationCap from "~icons/twemoji/graduation-cap";

export const FilterToggleSectionHeader = ({
  type,
}: {
  type: "course" | "professor";
}) => {
  const { sectionHeader, headerIcon } = filterToggleSectionTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className={sectionHeader()}>
      {type === "course" ? (
        <>
          <TwemojiBlueBook className={headerIcon()} />
          <Heading as="h2">Courses</Heading>
        </>
      ) : (
        <>
          <TwemojiGraduationCap className={headerIcon()} />
          <Heading as="h2">Professors</Heading>
        </>
      )}
    </div>
  );
};
