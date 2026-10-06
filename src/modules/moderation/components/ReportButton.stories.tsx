import type { Meta, StoryObj } from "@storybook/nextjs";

import { EdgeConfigContextProvider } from "@/common/providers/EdgeConfig/EdgeConfigContextProvider";
import fallback from "@/server/ecfg/config.json";

import { ReportButton } from "./ReportButton";

const withFlag = (on: boolean) =>
  function FlagDecorator(Story: () => React.ReactElement) {
    return (
      <EdgeConfigContextProvider
        edgeConfig={{ ...fallback, enableContentModeration: on }}
      >
        <Story />
      </EdgeConfigContextProvider>
    );
  };

const meta = {
  title: "Moderation/ReportButton",
  component: ReportButton,
  args: { surface: "review", refId: "review-1" },
} satisfies Meta<typeof ReportButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Enabled: Story = { decorators: [withFlag(true)] };
export const FlagOff: Story = { decorators: [withFlag(false)] };
