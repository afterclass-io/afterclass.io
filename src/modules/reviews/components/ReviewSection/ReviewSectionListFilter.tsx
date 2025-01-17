"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { Tag } from "@/common/components/Tag";
import { RadioGroup, RadioGroupItem } from "@/common/components/RadioGroup";
import { Label } from "@/common/components/Label";
import { ReviewsFilterFor } from "@/modules/reviews/types";

export const ReviewSectionListFilter = () => {
  const [filterFor, setFilterFor] = useState<ReviewsFilterFor>(
    ReviewsFilterFor.ALL,
  );
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const options = session
    ? [
        { label: "All", value: ReviewsFilterFor.ALL },
        { label: "Upvoted", value: ReviewsFilterFor.UPVOTED },
      ]
    : [{ label: "All", value: ReviewsFilterFor.ALL }];

  return (
    <RadioGroup
      className="flex px-4"
      onValueChange={(newValue) => {
        setFilterFor(newValue as ReviewsFilterFor);

        const params = new URLSearchParams();
        params.set("filter", newValue);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      {options.map((option, index) => (
        <div key={option.value}>
          <RadioGroupItem
            value={option.value}
            id={`r${index + 1}`}
            className="hidden"
          />
          <Label htmlFor={`r${index + 1}`}>
            <Tag clickable active={filterFor === option.value}>
              {option.label}
            </Tag>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
};
