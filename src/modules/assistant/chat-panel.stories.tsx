import type { Meta, StoryObj } from "@storybook/react";
import { ChatPanel } from "./chat-panel";
import type { AssistantStatus } from "@/server/assistant/status";

const status = (overrides: Partial<AssistantStatus> = {}): AssistantStatus => ({
  signedIn: true,
  quota: 50,
  used: 7,
  remaining: 43,
  spendPaused: false,
  hasConnectedAgent: false,
  nudgeAt: 40,
  ...overrides,
});

const meta = {
  title: "Assistant/Chat Bot",
  component: ChatPanel,
  parameters: {
    assistant: {
      status: status(),
      sessions: [],
    },
  },
} satisfies Meta<typeof ChatPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Initial: Story = {
  args: { quota: 50, remaining: 43, hasConnectedAgent: false, onGate: () => undefined },
};

export const Conversation: Story = {
  args: { quota: 50, remaining: 43, hasConnectedAgent: false, onGate: () => undefined },
  parameters: {
    chatState: {
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "Find a course" }] },
        { id: "2", role: "assistant", parts: [{ type: "text", text: "Try COR-IS1702." }] },
      ],
    },
  },
};

export const Streaming: Story = {
  args: { quota: 50, remaining: 43, hasConnectedAgent: false, onGate: () => undefined },
  parameters: {
    chatState: {
      status: "streaming",
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "Plan my semester" }] },
        { id: "2", role: "assistant", parts: [{ type: "text", text: "Building your plan..." }] },
      ],
    },
  },
};

export const Error: Story = {
  args: { quota: 50, remaining: 43, hasConnectedAgent: false, onGate: () => undefined },
  parameters: {
    chatState: {
      status: "error",
      error: new globalThis.Error("[POST /api/chat] 500: something failed"),
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      ],
    },
  },
};

export const QuotaAlert: Story = {
  args: { quota: 50, remaining: 5, hasConnectedAgent: false, onGate: () => undefined },
  parameters: {
    assistant: { status: status({ remaining: 5 }), sessions: [] },
  },
};
