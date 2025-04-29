"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useFormContext } from "react-hook-form";

import { Button } from "@/common/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/common/components/select";
import { ChevronDownIcon } from "@/common/components/icons";
import { type ReviewFormInputsSchema } from "@/common/tools/zod/schemas";

import { ReviewerEnum } from "@/modules/submit/types";
import { Loader2 } from "lucide-react";

export const SubmitButtonGroup = ({ isLoading }: { isLoading: boolean }) => {
  const [submitAs, setSubmitAs] = useState<ReviewerEnum>(ReviewerEnum.USER);
  const { setValue } = useFormContext<ReviewFormInputsSchema>();
  const { data: session } = useSession();

  useEffect(() => {
    setValue("submitAs", submitAs);
  }, []);

  const submitAsBtnText =
    submitAs === ReviewerEnum.ANONYMOUS
      ? "Anonymously"
      : `as ${session?.user.email}`;

  return (
    <div className="borde border-primary/80 bg-primary inline-flex h-10 shrink-0 items-center justify-center rounded-3xl">
      <Button
        type="submit"
        className="borde border-primary/80 flex content-center items-center gap-2 self-stretch rounded-none rounded-l-3xl pr-3 pl-4"
        disabled={isLoading}
        data-test="review-submit-button"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>Submit {session && submitAsBtnText}</>
        )}
      </Button>
      <Select
        onValueChange={(v) => {
          const value = v as ReviewerEnum;
          setSubmitAs(value);
          setValue("submitAs", value);
        }}
        defaultValue={submitAs}
      >
        <SelectTrigger
          asChild
          className="borde border-primary/80 flex h-full w-auto content-center items-center gap-4 self-stretch rounded-none rounded-r-3xl py-3"
        >
          <Button data-test="review-submit-select-trigger">
            <ChevronDownIcon className="size-5" />
          </Button>
        </SelectTrigger>
        <SelectContent align="end" sideOffset={8}>
          <SelectGroup>
            {session && (
              <SelectItem
                className="h-10 gap-2 self-stretch py-4 text-sm font-medium"
                value={ReviewerEnum.USER}
                data-test="review-submit-select-user"
              >
                Submit as {session.user.email}
              </SelectItem>
            )}
            <SelectItem
              className="h-10 gap-2 self-stretch py-4 text-sm font-medium"
              value={ReviewerEnum.ANONYMOUS}
              data-test="review-submit-select-anon"
            >
              Submit Anonymously
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
