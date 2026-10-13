import type { Meta, StoryObj } from "@storybook/nextjs";

import { useState, type ReactNode } from "react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ReviewFormSection } from "./ReviewFormSection";

import { api } from "@/common/tools/trpc/react";
import {
  type ReviewFormInputsSchema,
  reviewFormSchema,
} from "@/common/tools/zod/schemas";
import { ReviewableEnum } from "@/common/types/reviews";

const MOCK_COURSES = [
  { id: "c1", code: "ACCT101", name: "Financial Accounting" },
  { id: "c2", code: "ACCT102", name: "Management Accounting" },
  { id: "c3", code: "IS216", name: "Enterprise Architecture" },
];

const MOCK_PROFESSORS = [
  { id: "p1", slug: "megan-figueroa", name: "Megan Figueroa" },
  { id: "p2", slug: "spencer-randolph", name: "Spencer Randolph" },
  { id: "p3", slug: "kailey-xiong", name: "Kailey Xiong" },
];

function SeedReviewFormData({ children }: { children: ReactNode }) {
  const utils = api.useUtils();
  useState(() => {
    const updatedAt = Date.now() + 60 * 60 * 1000;
    const queries = ["", "acct", "ACCT", "is", "IS", "stat", "STAT"];
    for (const q of queries) {
      utils.search.courses.setData(
        { query: q, limit: 10 },
        { rows: MOCK_COURSES, total: MOCK_COURSES.length },
        { updatedAt },
      );
    }
    const profQueries = [
      "",
      "megan",
      "Megan",
      "spencer",
      "Spencer",
      "kailey",
      "Kailey",
    ];
    for (const q of profQueries) {
      utils.search.professors.setData(
        { query: q, limit: 10 },
        { rows: MOCK_PROFESSORS, total: MOCK_PROFESSORS.length },
        { updatedAt },
      );
    }
  });
  return <>{children}</>;
}

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/ReviewFormSection",
  component: ReviewFormSection,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <SeedReviewFormData>
        <Story />
      </SeedReviewFormData>
    ),
  ],
  args: {
    reviewLabels: [
      {
        label: "Engaging",
        value: "ENGAGING",
      },
      {
        label: "Knowledgeable",
        value: "KNOWLEDGEABLE",
      },
      {
        label: "Fair grading",
        value: "FAIR_GRADING",
      },
      {
        label: "Effective teaching",
        value: "EFFECTIVE_TEACHING",
      },
      {
        label: "Manageable workload",
        value: "MANAGEABLE_WORKLOAD",
      },
    ],
    maxRating: 5,
    type: "course",
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof ReviewFormSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const formMethods = useForm<ReviewFormInputsSchema>({
      resolver: zodResolver(reviewFormSchema),
      mode: "onTouched",
      defaultValues: {
        type: ReviewableEnum.COURSE,
      },
    });

    const onSubmit: SubmitHandler<ReviewFormInputsSchema> = (data) => {
      console.log(data);
      formMethods.reset();
    };

    return (
      <FormProvider {...formMethods}>
        <form
          className="inline-flex flex-col items-start gap-[3.125rem]"
          onSubmit={formMethods.handleSubmit(onSubmit)}
        >
          <ReviewFormSection {...args} />
        </form>
      </FormProvider>
    );
  },
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Skippable: Story = {
  ...Default,
  args: {
    ...Default.args,
    type: "professor",
    isOptional: true,
  },
};
