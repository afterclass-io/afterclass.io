import type { Meta, StoryObj } from "@storybook/nextjs";
import { AssistantWidget } from "./assistant-widget";
import { ChatPanel } from "./chat-panel";
import { ConnectGate } from "./connect-gate";

const meta = {
  title: "Assistant/Chat Widget",
  component: AssistantWidget,
  parameters: {
    // keep meta parameters minimal - set per-story props (Storybook deep-merges)
    viewport: { defaultViewport: "desktop" },
  },
} satisfies Meta<typeof AssistantWidget>;

export default meta;

type Story = StoryObj<typeof AssistantWidget>;

// Use the real ChatPanel as children - the `withAssistant` decorator seeds the
// chat store (hydrated: true, so hydrate() short-circuits IndexedDB) and the
// @ai-sdk/react alias falls through to the real useChat when no `chatState`
// parameter is set (which makes no request on mount).
const chatPanel = (
  <ChatPanel
    quota={30}
    remaining={12}
    hasConnectedAgent={false}
    aiDegraded={false}
    onGate={() => undefined}
    aiConsented
    onConsented={() => undefined}
    onConsentRevoked={() => undefined}
  />
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
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "Find me a course" }],
        },
        {
          id: "2",
          role: "assistant",
          parts: [{ type: "text", text: "Here's what I found." }],
        },
      ],
    },
  },
};

export const Dark: Story = {
  args: { open: true, onOpenChange: () => undefined, children: chatPanel },
  parameters: { themes: { themeOverride: "dark" } },
};

export const Streaming: Story = {
  args: { open: true, onOpenChange: () => undefined, children: chatPanel },
  parameters: {
    chatState: {
      status: "streaming",
      messages: [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "Plan my semester" }],
        },
        {
          id: "2",
          role: "assistant",
          parts: [{ type: "text", text: "Building your plan..." }],
        },
      ],
    },
  },
};

export const ErrorState: Story = {
  args: { open: true, onOpenChange: () => undefined, children: chatPanel },
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

/**
 * Post-gate surface: the provider renders `<ConnectGate>` in place of the
 * widget body once `onGate` fires (assistant-provider.tsx), so the widget
 * chrome shows the gate copy instead of the thread.
 */
export const GateState: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    children: <ConnectGate reason="quota" />,
  },
};
