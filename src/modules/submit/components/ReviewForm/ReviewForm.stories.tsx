import type { Meta, StoryObj } from "@storybook/nextjs";

import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ReviewFormSection } from "./ReviewFormSection";

import {
  type ReviewFormInputsSchema,
  reviewFormSchema,
} from "@/common/tools/zod/schemas";
import { ReviewableEnum } from "@/modules/submit/types";

const comboboxItems = [
  {
    value: "megan-figueroa",
    label: "Megan Figueroa",
  },
  {
    value: "spencer-randolph",
    label: "Spencer Randolph",
  },
  {
    value: "kailey-xiong",
    label: "Kailey Xiong",
  },
  {
    value: "azrael-powers",
    label: "Azrael Powers",
  },
  {
    value: "michelle-madden",
    label: "Michelle Madden",
  },
  {
    value: "everest-fuentes",
    label: "Everest Fuentes",
  },
  {
    value: "madeleine-weiss",
    label: "Madeleine Weiss",
  },
  {
    value: "koa-nicholson",
    label: "Koa Nicholson",
  },
  {
    value: "justice-hamilton",
    label: "Justice Hamilton",
  },
  {
    value: "jason-choi",
    label: "Jason Choi",
  },
  {
    value: "karla-freeman",
    label: "Karla Freeman",
  },
];

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/ReviewFormSection",
  component: ReviewFormSection,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    comboboxItems: comboboxItems,
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
