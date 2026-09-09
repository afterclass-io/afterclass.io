import type { Meta, StoryObj } from "@storybook/nextjs";
import View from "./view";
import { withMcpView } from "../../.storybook/withMcpView";

/**
 * Stories for the calendar-links View (mcp-use v2).
 *
 * Seeding mechanism: the shared `.storybook/withMcpView` decorator wraps each
 * story in the seed context consumed by the webpack-aliased
 * `.storybook/mocks/mcp-use-react.ts` module (the real v2 hooks require the
 * module-private bootstrapView runtime that only exists inside an MCP Apps
 * host, so Storybook runs against seeded implementations instead).
 *
 * NOTE: URLs live in the View-only `_meta` channel (seeded via
 * `McpViewParams.meta`); `toolOutput` only carries `{timetableId,
 * madeLinkShareable}` — mirroring the tool's secret-isolation contract.
 */

const metaUrls = {
  feedUrl: "https://afterclass.io/api/ical/tok123",
  subscribeUrl: "webcal://afterclass.io/api/ical/tok123",
  googleSubscribeUrl:
    "https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123",
  appleSubscribeUrl: "webcal://afterclass.io/api/ical/tok123",
  outlookSubscribeUrl:
    "https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123",
};

const toolOutput = { timetableId: "tt1", madeLinkShareable: false };

const meta: Meta<typeof View> = {
  title: "MCP Views/calendar-links",
  component: View,
};

export default meta;
type Story = StoryObj<typeof View>;

export const Default: Story = {
  decorators: [withMcpView({ status: "ready", toolOutput, meta: metaUrls })],
};

export const Dark: Story = {
  decorators: [
    withMcpView({ status: "ready", toolOutput, meta: metaUrls, theme: "dark" }),
  ],
};

export const Shareable: Story = {
  decorators: [
    withMcpView({
      status: "ready",
      toolOutput: { ...toolOutput, madeLinkShareable: true },
      meta: metaUrls,
    }),
  ],
};

// Partial meta: only the feed URL survived (e.g. truncated _meta) — the View
// renders the feed input + copy button with a fallback note naming the
// missing subscribe links instead of dead href="" anchors.
const partialMetaUrls = {
  feedUrl: metaUrls.feedUrl,
};

export const PartialMeta: Story = {
  decorators: [
    withMcpView({ status: "ready", toolOutput, meta: partialMetaUrls }),
  ],
};

export const Loading: Story = {
  decorators: [withMcpView({ status: "pending" })],
};

export const ErrorState: Story = {
  decorators: [
    withMcpView({ status: "error", error: { message: "Unauthorized" } }),
  ],
};

/** QuotaExceeded: the write budget is exhausted — friendly slow-down. */
export const QuotaExceeded: Story = {
  decorators: [
    withMcpView({
      status: "error",
      error: {
        message:
          "Write rate limit exceeded: at most 60 write operations per minute are allowed. Please wait ~12s before trying again.",
      },
    }),
  ],
};

/** ConfirmRequired: the confirm:true gate rejects the unconfirmed call. */
export const ConfirmRequired: Story = {
  decorators: [
    withMcpView({
      status: "error",
      error: {
        message:
          'Tool "get-timetable-calendar-link" changes or publishes your data and requires explicit confirmation: call again with confirm:true after showing the user exactly what will change and getting explicit approval.',
      },
    }),
  ],
};
