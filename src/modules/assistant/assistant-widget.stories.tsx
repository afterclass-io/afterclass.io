import type { Meta, StoryObj } from "@storybook/react";
import { AssistantWidget } from "./assistant-widget";
import { ChatPanel } from "./chat-panel";

const meta = {
  title: "Assistant/Chat Widget",
  component: AssistantWidget,
  parameters: {
    // keep meta parameters minimal - set per-story props (Storybook deep-merges)
    viewport: { defaultViewport: "desktop" },
  },
  decorators: [],
} satisfies Meta<typeof AssistantWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

// Use the real ChatPanel as children - the `withAssistant` decorator seeds the
// chat store (hydrated: true, so hydrate() short-circuits IndexedDB) and the
// @ai-sdk/react alias falls through to the real useChat when no `chatState`
// parameter is set (which makes no request on mount).
const chatPanel = (
  <ChatPanel quota={30} remaining={12} hasConnectedAgent={false} onGate={() => undefined} />
);

export const LauncherClosed: Story = {
  args: { open: false, onOpenChange: () => undefined, children: chatPanel },
};

export const OpenEmpty: Story = {
  args: { open: true, onOpenChange: () => undefined, children: chatPanel },
};

export const OpenThread: Story = {
  args: { open: true, onOpenChange: () => undefined, children: chatPanel },
  parameters: {
    chatState: {
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "Find me a course" }] },
        { id: "2", role: "assistant", parts: [{ type: "text", text: "Here's what I found." }] },
      ],
    },
  },
};

export const Dark: Story = {
  args: { open: true, onOpenChange: () => undefined, children: chatPanel },
  parameters: { themes: { themeOverride: "dark" } },
};
