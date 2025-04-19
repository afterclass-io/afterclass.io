"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { Combobox } from "@/modules/submit/components/Combobox";
import { Button } from "@/common/components/button";
import { RatingGroup } from "@/common/components/RatingGroup";
import { TagToggleGroup } from "@/common/components/TagToggleGroup";
import { Textarea } from "@/common/components/textarea";
import { type ReviewFormInputsSchema } from "@/common/tools/zod/schemas";
import { ReviewableEnum, type ReviewableType } from "@/modules/submit/types";
import { texts } from "@/modules/submit/constants";

import { reviewFormTheme } from "./ReviewForm.theme";
import { Form } from "@/common/components/form";

export type ReviewFormSectionProps = {
  type: ReviewableType;
  comboboxItems: { value: string; label: string }[];
  maxRating: number;
  reviewLabels: { value: string; label: string }[];
  isOptional?: boolean;
};

export const ReviewFormSection = ({
  type,
  comboboxItems,
  maxRating,
  reviewLabels,
  isOptional = false,
}: ReviewFormSectionProps) => {
  const { control, setValue } = useFormContext<ReviewFormInputsSchema>();
  const { wrapper, header, button, divider, lower, textarea } = reviewFormTheme(
    {
      size: { initial: "sm", md: "md" },
    },
  );
  const [isSkipped, setIsSkipped] = useState(false);

  return (
    <div className={wrapper()} data-test={`review-form-${type}-section`}>
      <div className={header()}>
        <Form.Field
          control={control}
          name={`${type}.value`}
          render={({ field }) => (
            <Form.Item>
              <Form.Label>{texts.COMBOBOX.FIELD_LABEL[type]}</Form.Label>
              <Form.Control>
                <Combobox
                  items={comboboxItems}
                  placeholder={texts.COMBOBOX.PLACEHOLDER[type]}
                  triggerLabel={texts.COMBOBOX.TRIGGER_LABEL[type]}
                  onSelectChange={field.onChange}
                />
              </Form.Control>
              <Form.Message />
            </Form.Item>
          )}
        />
        {isOptional &&
          (isSkipped ? (
            <Button
              variant="secondary"
              type="button"
              className={button()}
              onClick={() => {
                setIsSkipped(false);
                setValue("type", ReviewableEnum.PROFESSOR);
                setValue(ReviewableEnum.PROFESSOR, {});
              }}
              data-test={`review-form-${type}-toggle-write`}
            >
              Write review
            </Button>
          ) : (
            <Button
              variant="tertiary"
              type="button"
              className={button()}
              onClick={() => {
                setIsSkipped(true);
                setValue("type", ReviewableEnum.COURSE);
                setValue(ReviewableEnum.PROFESSOR, {});
              }}
              data-test={`review-form-${type}-toggle-skip`}
            >
              Skip review
            </Button>
          ))}
      </div>
      {!isSkipped && (
        <>
          <hr className={divider()} />
          <div className={lower()}>
            <Form.Field
              control={control}
              name={`${type}.rating`}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{texts.RATING.FIELD_LABEL[type]}</Form.Label>
                  <Form.Control>
                    <RatingGroup
                      maxRating={maxRating}
                      {...field}
                      data-test={`review-form-${type}-rating`}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              )}
            />

            <Form.Field
              control={control}
              name={`${type}.labels`}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{texts.TAGS.FIELD_LABEL[type]}</Form.Label>
                  <Form.Control>
                    <TagToggleGroup
                      items={reviewLabels}
                      {...field}
                      data-test={`review-form-${type}-label`}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              )}
            />

            <Form.Field
              control={control}
              name={`${type}.body`}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{texts.BODY.FIELD_LABEL[type]}</Form.Label>
                  <Form.Control>
                    <Textarea
                      className={textarea()}
                      placeholder={texts.BODY.PLACEHOLDER[type]}
                      {...field}
                      data-test={`review-form-${type}-body`}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              )}
            />

            <Form.Field
              control={control}
              name={`${type}.tips`}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{texts.TIPS.FIELD_LABEL[type]}</Form.Label>
                  <Form.Control>
                    <Textarea
                      className={textarea()}
                      placeholder={texts.TIPS.PLACEHOLDER[type]}
                      {...field}
                      data-test={`review-form-${type}-tips`}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
};
