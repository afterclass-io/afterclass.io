"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { z } from "zod";

import { RadioGroup, RadioGroupItem } from "@/common/components/radio-group";
import { Label } from "@/common/components/label";
import { ReviewsFilterFor } from "@/modules/reviews/types";
import { useEdgeConfigs } from "@/common/hooks";
import { Button, buttonVariants } from "@/common/components/button";
import { cn } from "@/common/functions";

export const ReviewSectionListFilter = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // prettier-ignore
  const defaultFilterFor = z.nativeEnum(ReviewsFilterFor)
                            .safeParse(searchParams?.get("filter"))
                            ?.data 
                          ?? ReviewsFilterFor.ALL;

  const [filterFor, setFilterFor] =
    useState<ReviewsFilterFor>(defaultFilterFor);

  useEffect(() => {
    if (filterFor !== defaultFilterFor) {
      setFilterFor(defaultFilterFor);
    }
  }, [defaultFilterFor]);

  const ecfg = useEdgeConfigs();
  if (!ecfg.enableReviewFilter) {
    return null;
  }

  const options = session
    ? [
        { label: "All", value: ReviewsFilterFor.ALL },
        { label: "Upvoted", value: ReviewsFilterFor.UPVOTED },
      ]
    : [{ label: "All", value: ReviewsFilterFor.ALL }];

  return (
    <RadioGroup
      className="flex"
      onValueChange={(newValue) => {
        setFilterFor(newValue as ReviewsFilterFor);

        const params = new URLSearchParams(searchParams ?? undefined);
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
          <Label
            htmlFor={`r${index + 1}`}
            className={cn(
              buttonVariants({
                variant: filterFor === option.value ? "default" : "outline",
              }),
              "rounded-full border",
            )}
          >
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
};
