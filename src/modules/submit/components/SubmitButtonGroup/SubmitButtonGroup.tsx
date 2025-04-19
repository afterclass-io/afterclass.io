"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useFormContext } from "react-hook-form";

import { Button } from "@/common/components/button";
import { Select } from "@/common/components/Select";
import { ChevronDownIcon } from "@/common/components/icons";
import { type ReviewFormInputsSchema } from "@/common/tools/zod/schemas";

import { ReviewerEnum } from "@/modules/submit/types";

import { submitButtonGroupTheme } from "./SubmitButtonGroup.theme";

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
        variant="primary"
        type="submit"
        className={submitButton()}
        loading={isLoading}
        data-test="review-submit-button"
      >
        Submit {session && submitAsBtnText}
      </Button>
      <Select
        onValueChange={(v) => {
          const value = v as ReviewerEnum;
          setSubmitAs(value);
          setValue("submitAs", value);
        }}
        defaultValue={submitAs}
      >
        <Select.Trigger asChild className={selectTrigger()}>
          <Button variant="primary" data-test="review-submit-select-trigger">
            <ChevronDownIcon className={selectIcon()} />
          </Button>
        </Select.Trigger>
        <Select.Content align="end" sideOffset={8}>
          <Select.Group>
            {session && (
              <Select.Item
                className={selectItem()}
                value={ReviewerEnum.USER}
                data-test="review-submit-select-user"
              >
                Submit as {session.user.email}
              </Select.Item>
            )}
            <Select.Item
              className={selectItem()}
              value={ReviewerEnum.ANONYMOUS}
              data-test="review-submit-select-anon"
            >
              Submit Anonymously
            </Select.Item>
          </Select.Group>
        </Select.Content>
      </Select>
    </div>
  );
};
