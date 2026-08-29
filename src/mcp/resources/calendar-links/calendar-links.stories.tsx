import type { Meta, StoryObj } from "@storybook/react";
import CalendarLinks from "./widget";
import { withMcpWidget } from "../../../../.storybook/withMcpWidget";

const fullProps = {
  feedUrl: "https://afterclass.io/api/ical/tok123",
  subscribeUrl: "webcal://afterclass.io/api/ical/tok123",
  googleSubscribeUrl:
    "https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123",
  appleSubscribeUrl: "webcal://afterclass.io/api/ical/tok123",
  outlookSubscribeUrl:
    "https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Fafterclass.io%2Fapi%2Fical%2Ftok123",
  madeLinkShareable: false,
};

const meta: Meta<typeof CalendarLinks> = {
  title: "MCP Apps/Calendar Links",
  component: CalendarLinks,
  decorators: [withMcpWidget],
  parameters: {},
};

export default meta;
type Story = StoryObj<typeof CalendarLinks>;

export const Default: Story = {
  parameters: { mcpWidget: { props: fullProps } },
};

export const Dark: Story = {
  parameters: { mcpWidget: { props: fullProps, theme: "dark" } },
};

export const MadeLinkShareable: Story = {
  parameters: { mcpWidget: { props: { ...fullProps, madeLinkShareable: true } } },
};

export const Loading: Story = {
  parameters: { mcpWidget: { toolOutput: null } },
};
