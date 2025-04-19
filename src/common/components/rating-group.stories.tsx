import type { Meta, StoryObj } from "@storybook/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { RatingGroup } from "./rating-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/common/components/form";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/RatingGroup",
  component: RatingGroup,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    maxRating: 5,
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof RatingGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args

const formSchema = z.object({
  rating: z.number().positive().min(1).max(5),
});
type FormInputsSchema = z.infer<typeof formSchema>;

export const AsFormInput: Story = {
  render: () => {
    const form = useForm<FormInputsSchema>({
      resolver: zodResolver(formSchema),
    });

    return (
      <div>
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating *</FormLabel>
                  <FormControl>
                    <RatingGroup {...field} />
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
