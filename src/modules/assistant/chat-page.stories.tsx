import type { Meta, StoryObj } from "@storybook/react";
import { ChatPage } from "./chat-page";
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
  title: "Assistant/Chat Page",
  component: ChatPage,
  parameters: {
    assistant: { status: status(), sessions: [] },
  },
} satisfies Meta<typeof ChatPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { initialStatus: status() },
};

export const Conversation: Story = {
  args: { initialStatus: status() },
  parameters: {
    assistant: {
      status: status(),
      sessions: [
        { id: "s1", title: "Semester planning", updatedAt: new Date().toISOString(), messages: [] },
      ],
      activeSessionId: "s1",
    },
    chatState: {
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "Plan my semester" }] },
        { id: "2", role: "assistant", parts: [{ type: "text", text: "Here's your plan." }] },
      ],
    },
  },
};

export const QuotaGate: Story = {
  args: { initialStatus: status() },
  parameters: {
    chatState: {
      error: new globalThis.Error('[POST /api/chat] 403: {"gate":"quota"}'),
    },
  },
};

export const AgentConnected: Story = {
  args: { initialStatus: status({ hasConnectedAgent: true }) },
  parameters: {
    assistant: { status: status({ hasConnectedAgent: true }), sessions: [] },
  },
};

export const Dark: Story = {
  args: { initialStatus: status() },
  parameters: { themes: { themeOverride: "dark" } },
};
