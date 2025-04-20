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

import { submitButtonGroupTheme } from "./SubmitButtonGroup.theme";
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

  const { wrapper, submitButton, selectTrigger, selectIcon, selectItem } =
    submitButtonGroupTheme();

  return (
    <div className={wrapper()}>
      <Button
        type="submit"
        className={submitButton()}
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
        <SelectTrigger asChild className={selectTrigger()}>
          <Button data-test="review-submit-select-trigger">
            <ChevronDownIcon className={selectIcon()} />
          </Button>
        </SelectTrigger>
        <SelectContent align="end" sideOffset={8}>
          <SelectGroup>
            {session && (
              <SelectItem
                className={selectItem()}
                value={ReviewerEnum.USER}
                data-test="review-submit-select-user"
              >
                Submit as {session.user.email}
              </SelectItem>
            )}
            <SelectItem
              className={selectItem()}
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
