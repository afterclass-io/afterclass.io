import { RadioGroupProps } from "@radix-ui/react-radio-group";

import { Tag } from "@/common/components/Tag";
import { RadioGroup, RadioGroupItem } from "@/common/components/RadioGroup";
import { Label } from "@/common/components/Label";

export const ReviewItemsFilter = ({
  value,
  onChange,
}: {
  value: string;
  onChange: RadioGroupProps["onValueChange"];
}) => {
  const options = [
    { value: "all", label: "All Professors" },
    { value: "upvoted", label: "Upvoted" },
  ];

  return (
    <RadioGroup className="flex" onValueChange={onChange}>
      {options.map((option, index) => (
        <div key={option.value}>
          <RadioGroupItem
            value={option.value}
            id={`r${index + 1}`}
            className="hidden"
          />
          <Label htmlFor={`r${index + 1}`}>
            <Tag clickable active={value === option.value}>
              {option.label}
            </Tag>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
};
