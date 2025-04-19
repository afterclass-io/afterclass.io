import { SchoolIcon, type SchoolIconProps } from "@/common/components/icons";
import { Heading } from "@/common/components/heading";
import { Tag } from "@/common/components/tag";

export const SchoolTag = ({
  school,
}: {
  school: SchoolIconProps["school"];
}) => {
  return (
    <Tag contentLeft={<SchoolIcon school={school} />} className="py-1">
      <Heading as="h5">{school}</Heading>
    </Tag>
  );
};
