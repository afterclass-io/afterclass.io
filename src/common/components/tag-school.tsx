import { SchoolIcon, type SchoolIconProps } from "@/common/components/icons";
import { Heading } from "@/common/components/heading";
import { Tag } from "@/common/components/tag";

export const SchoolTag = ({
  school,
}: {
  school: SchoolIconProps["school"];
}) => {
  return (
    <Tag
      avatar={<SchoolIcon school={school} />}
      className="border-default rounded-full"
      deletable={false}
      variant="outline"
    >
      <Heading as="h5">{school}</Heading>
    </Tag>
  );
};
