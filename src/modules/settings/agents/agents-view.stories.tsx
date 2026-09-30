import type { Meta, StoryObj } from "@storybook/nextjs";
import { AgentsView } from "./agents-view";

const meta = {
  title: "Settings/AgentsView",
  component: AgentsView,
  tags: ["autodocs"],
} satisfies Meta<typeof AgentsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedOut: Story = { args: { state: { kind: "signed-out" } } };
export const NoToken: Story = { args: { state: { kind: "no-token" } } };
export const Error: Story = { args: { state: { kind: "error" } } };
export const Empty: Story = { args: { state: { kind: "ready", grants: [] } } };

export const Single: Story = {
  args: {
    state: {
      kind: "ready",
      grants: [
        { id: "g1", client_id: "cl1", client_name: "Gemini", scopes: [] },
      ],
    },
  },
};

export const Multiple: Story = {
  args: {
    state: {
      kind: "ready",
      grants: [
        { id: "g1", client_id: "cl1", client_name: "Claude", scopes: [] },
        { id: "g2", client_id: "cl2", client_name: "ChatGPT", scopes: [] },
        { id: "g3", client_id: "cl3", client_name: "Gemini", scopes: [] },
      ],
    },
  },
};
