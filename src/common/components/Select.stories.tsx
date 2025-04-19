import type { Meta, StoryObj } from "@storybook/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form } from "@/common/components/Form";
import { Select } from "./Select";
import { ChevronDownIcon } from "@/common/components/CustomIcon";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Select",
  component: Select,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {},
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <Select.Trigger className="w-[180px]">
        <Select.Value placeholder="Select a fruit" />
        <Select.Icon asChild>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.Label>Fruits</Select.Label>
          <Select.Item value="apple">Apple</Select.Item>
          <Select.Item value="banana">Banana</Select.Item>
          <Select.Item value="blueberry">Blueberry</Select.Item>
          <Select.Item value="grapes">Grapes</Select.Item>
          <Select.Item value="pineapple">Pineapple</Select.Item>
        </Select.Group>
      </Select.Content>
    </Select>
  ),
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
const formSchema = z.object({
  fruit: z.string(),
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
            <Form.Field
              control={form.control}
              name="fruit"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Fruit</Form.Label>
                  <Form.Control>
                    <Select onValueChange={field.onChange}>
                      <Select.Trigger className="w-[180px]">
                        <Select.Value placeholder="Select a fruit" />
                        <Select.Icon asChild>
                          <ChevronDownIcon className="h-4 w-4 opacity-50" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>Fruits</Select.Label>
                          <Select.Item value="apple">Apple</Select.Item>
                          <Select.Item value="banana">Banana</Select.Item>
                          <Select.Item value="blueberry">Blueberry</Select.Item>
                          <Select.Item value="grapes">Grapes</Select.Item>
                          <Select.Item value="pineapple">Pineapple</Select.Item>
                        </Select.Group>
                      </Select.Content>
                    </Select>
                  </Form.Control>
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
