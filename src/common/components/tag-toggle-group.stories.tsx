import type { Meta, StoryObj } from "@storybook/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { TagToggleGroup } from "./tag-toggle-group";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormItem,
} from "@/common/components/form";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/TagToggleGroup",
  component: TagToggleGroup,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    items: [
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
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof TagToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args

const formSchema = z.object({
  tags: z.array(z.string()),
});
type FormInputsSchema = z.infer<typeof formSchema>;

export const AsFormInput: Story = {
  parameters: {
    docs: {
      source: {
        type: "code",
      },
    },
  },
  render: (args) => {
    const form = useForm<FormInputsSchema>({
      resolver: zodResolver(formSchema),
    });
    return (
      <div>
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags *</FormLabel>
                  <FormControl>
                    <TagToggleGroup {...args} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <hr className="my-4" />
        <pre>{JSON.stringify(form.watch())}</pre>
      </div>
    );
  },
};
