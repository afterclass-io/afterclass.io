"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { Combobox } from "@/modules/submit/components/Combobox";
import { Button } from "@/common/components/button";
import { RatingGroup } from "@/common/components/rating-group";
import { TagToggleGroup } from "@/common/components/tag-toggle-group";
import { Textarea } from "@/common/components/textarea";
import { type ReviewFormInputsSchema } from "@/common/tools/zod/schemas";
import { ReviewableEnum, type ReviewableType } from "@/modules/submit/types";
import { texts } from "@/modules/submit/constants";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/form";
import { Separator } from "@/common/components/separator";

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
  const [isSkipped, setIsSkipped] = useState(false);

  return (
    <div
      className="bg-card flex w-full flex-col items-start gap-6 rounded-2xl px-4 py-6 sm:px-6 sm:py-8 md:w-160"
      data-test={`review-form-${type}-section`}
    >
      <div className="flex flex-col items-start justify-between gap-6 self-stretch sm:flex-row">
        <FormField
          control={control}
          name={`${type}.value`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{texts.COMBOBOX.FIELD_LABEL[type]}</FormLabel>
              <FormControl>
                <Combobox
                  items={comboboxItems}
                  placeholder={texts.COMBOBOX.PLACEHOLDER[type]}
                  triggerLabel={texts.COMBOBOX.TRIGGER_LABEL[type]}
                  onSelectChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isOptional &&
          (isSkipped ? (
            <Button
              variant="secondary"
              type="button"
              className="min-w-fit text-sm"
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
              variant="destructive"
              type="button"
              className="min-w-fit text-sm"
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
          <Separator />
          <div className="flex flex-col items-start gap-8 self-stretch">
            <FormField
              control={control}
              name={`${type}.rating`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{texts.RATING.FIELD_LABEL[type]}</FormLabel>
                  <FormControl>
                    <RatingGroup
                      maxRating={maxRating}
                      {...field}
                      data-test={`review-form-${type}-rating`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`${type}.labels`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{texts.TAGS.FIELD_LABEL[type]}</FormLabel>
                  <FormControl>
                    <TagToggleGroup
                      items={reviewLabels}
                      {...field}
                      data-test={`review-form-${type}-label`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`${type}.body`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{texts.BODY.FIELD_LABEL[type]}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="w-full"
                      placeholder={texts.BODY.PLACEHOLDER[type]}
                      {...field}
                      data-test={`review-form-${type}-body`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`${type}.tips`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{texts.TIPS.FIELD_LABEL[type]}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="w-full"
                      placeholder={texts.TIPS.PLACEHOLDER[type]}
                      {...field}
                      data-test={`review-form-${type}-tips`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
};
