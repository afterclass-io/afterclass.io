import type { Meta, StoryObj } from "@storybook/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { RadioGroup, RadioGroupItem } from "./RadioGroup";
import { Form } from "@/common/components/Form";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/RadioGroup",
  component: RadioGroup,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {},
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args

const formSchema = z.object({
  type: z.enum(["all", "mentions", "none"], {
    required_error: "You need to select a notification type.",
  }),
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
  render: (_) => {
    const form = useForm<FormInputsSchema>({
      resolver: zodResolver(formSchema),
    });
    return (
      <div>
        <Form {...form}>
          <form>
            <Form.Field
              control={form.control}
              name="type"
              render={({ field }) => (
                <Form.Item className="space-y-3">
                  <Form.Label>Notify me about...</Form.Label>
                  <Form.Control>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <Form.Item className="flex items-center space-x-3 space-y-0">
                        <Form.Control>
                          <RadioGroupItem value="all" />
                        </Form.Control>
                        <Form.Label className="font-normal">
                          All new messages
                        </Form.Label>
                      </Form.Item>
                      <Form.Item className="flex items-center space-x-3 space-y-0">
                        <Form.Control>
                          <RadioGroupItem value="mentions" />
                        </Form.Control>
                        <Form.Label className="font-normal">
                          Direct messages and mentions
                        </Form.Label>
                      </Form.Item>
                      <Form.Item className="flex items-center space-x-3 space-y-0">
                        <Form.Control>
                          <RadioGroupItem value="none" />
                        </Form.Control>
                        <Form.Label className="font-normal">Nothing</Form.Label>
                      </Form.Item>
                    </RadioGroup>
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
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
