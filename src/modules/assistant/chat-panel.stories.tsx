import type { Meta, StoryObj } from "@storybook/nextjs";
import { ChatPanel } from "./chat-panel";
import { ConnectGate } from "./connect-gate";
import type { AssistantStatus } from "@/server/assistant/status";

const status = (overrides: Partial<AssistantStatus> = {}): AssistantStatus => ({
  signedIn: true,
  quota: 50,
  used: 7,
  remaining: 43,
  hasConnectedAgent: false,
  nudgeAt: 40,
  aiDegraded: false,
  chatEnabled: true,
  widgetEnabled: true,
  aiConsented: true,
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
  args: {
    quota: 50,
    remaining: 43,
    hasConnectedAgent: false,
    aiDegraded: false,
    onGate: () => undefined,
    aiConsented: true,
    onConsented: () => undefined,
    onConsentRevoked: () => undefined,
  },
};

export const Unconsented: Story = {
  args: {
    quota: 50,
    remaining: 43,
    hasConnectedAgent: false,
    aiDegraded: false,
    onGate: () => undefined,
    aiConsented: false,
    onConsented: () => undefined,
    onConsentRevoked: () => undefined,
  },
};

export const Degraded: Story = {
  args: {
    quota: 50,
    remaining: 43,
    hasConnectedAgent: false,
    aiDegraded: true,
    onGate: () => undefined,
    aiConsented: true,
    onConsented: () => undefined,
    onConsentRevoked: () => undefined,
  },
};

export const Conversation: Story = {
  args: {
    quota: 50,
    remaining: 43,
    hasConnectedAgent: false,
    aiDegraded: false,
    onGate: () => undefined,
    aiConsented: true,
    onConsented: () => undefined,
    onConsentRevoked: () => undefined,
  },
  parameters: {
    chatState: {
      messages: [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "Find a course" }],
        },
        {
          id: "2",
          role: "assistant",
          parts: [{ type: "text", text: "Try COR-IS1702." }],
        },
      ],
    },
  },
};

export const Streaming: Story = {
  args: {
    quota: 50,
    remaining: 43,
    hasConnectedAgent: false,
    aiDegraded: false,
    onGate: () => undefined,
    aiConsented: true,
    onConsented: () => undefined,
    onConsentRevoked: () => undefined,
  },
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

export const Error: Story = {
  args: {
    quota: 50,
    remaining: 43,
    hasConnectedAgent: false,
    aiDegraded: false,
    onGate: () => undefined,
    aiConsented: true,
    onConsented: () => undefined,
    onConsentRevoked: () => undefined,
  },
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
  args: {
    quota: 50,
    remaining: 5,
    hasConnectedAgent: false,
    aiDegraded: false,
    onGate: () => undefined,
    aiConsented: true,
    onConsented: () => undefined,
    onConsentRevoked: () => undefined,
  },
  parameters: {
    assistant: { status: status({ remaining: 5 }), sessions: [] },
  },
};

export const Dark: Story = {
  args: {
    quota: 50,
    remaining: 43,
    hasConnectedAgent: false,
    aiDegraded: false,
    onGate: () => undefined,
    aiConsented: true,
    onConsented: () => undefined,
    onConsentRevoked: () => undefined,
  },
  parameters: {
    themes: { themeOverride: "dark" },
    chatState: {
      messages: [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "Find a course" }],
        },
        {
          id: "2",
          role: "assistant",
          parts: [{ type: "text", text: "Try COR-IS1702." }],
        },
      ],
    },
  },
};

/**
 * Quota exhausted: the panel routes quota gates to `onGate`, so the host
 * swaps the thread for the gate card — this is that composition in a
 * panel-height frame.
 */
export const QuotaExhausted: Story = {
  args: {
    quota: 50,
    remaining: 0,
    hasConnectedAgent: false,
    aiDegraded: false,
    onGate: () => undefined,
    aiConsented: true,
    onConsented: () => undefined,
    onConsentRevoked: () => undefined,
  },
  render: () => (
    <div className="flex h-[560px] w-[400px] max-w-full flex-col">
      <ConnectGate reason="quota" />
    </div>
  ),
};
