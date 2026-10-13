/**
 * Zod schemas for custom validation
 */
import { env } from "@/env";
import { z } from "zod";

import { emailMatchesDomain } from "@/common/functions/email-domain";
import { ReviewableEnum, ReviewerEnum } from "@/common/types/reviews";

/**
 * Schema for the authentication form inputs
 */
export const emailValidationSchema = z
  .string()
  .min(1, {
    error: "Email is required",
  })
  .pipe(z.email({ error: "Please enter a valid email address" }))
  .refine(
    (email) =>
      env.NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS.some((domain) =>
        emailMatchesDomain(email, domain),
      ),
    `Unsupported email domain, please choose from: ${env.NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS.join(", ")}`,
  );

/**
 * Schema for the review submission form inputs
 */
const reviewLabelSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Label ID must be a positive integer")
  .refine((val) => {
    const num = Number(val);
    return Number.isSafeInteger(num) && num <= 2147483647;
  }, "Label ID must not exceed 2147483647");

function createReviewItemSchema({
  valueMessage,
  ratingMessage,
}: {
  valueMessage: string;
  ratingMessage: string;
}) {
  return z.object({
    value: z.string().min(1, valueMessage).max(100),
    // NOTE: was z.coerce.number(); switched to z.number() for zod v4 - zodResolver's input/output types diverge with coerce (input: unknown, output: number); producers (RatingGroup/ReviewForm) already emit number; if a string source is added, reintroduce coercion via .pipe(z.coerce.number()).
    rating: z
      .number()
      .min(1, ratingMessage)
      .max(5, "Rating must be between 1 and 5"),
    labels: reviewLabelSchema.array().max(20).optional(),
    body: z
      .string()
      .max(5000)
      .superRefine((val, ctx) => {
        if (val.length < 200) {
          ctx.addIssue({
            code: "custom",
            message: `Help other students by writing a longer review. ${200 - val.length} more characters to go.`,
          });
        }
      }),
    tips: z.string().max(2000),
  });
}

const courseReviewFormSchema = createReviewItemSchema({
  valueMessage: "This field is required",
  ratingMessage: "Please select your rating for this course",
});

const professorReviewFormSchema = createReviewItemSchema({
  valueMessage: "Please select a professor",
  ratingMessage: "Please select your rating for this professor",
});

export const reviewFormSchema = z.discriminatedUnion("type", [
  z.object({
    [ReviewableEnum.COURSE]: courseReviewFormSchema,
    [ReviewableEnum.PROFESSOR]: professorReviewFormSchema,
    type: z.literal(ReviewableEnum.PROFESSOR),
    submitAs: z.enum(ReviewerEnum),
  }),
  z.object({
    [ReviewableEnum.COURSE]: courseReviewFormSchema,
    [ReviewableEnum.PROFESSOR]: professorReviewFormSchema.partial(),
    type: z.literal(ReviewableEnum.COURSE),
    submitAs: z.enum(ReviewerEnum),
  }),
]);
export type ReviewFormInputsSchema = z.infer<typeof reviewFormSchema>;
