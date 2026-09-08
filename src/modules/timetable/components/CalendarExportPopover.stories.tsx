import type { Meta, StoryObj } from "@storybook/nextjs";
import { CalendarExportPopoverView } from "./CalendarExportPopover";

/**
 * Storybook coverage for the "Add to calendar" popover.
 *
 * Rendered through the presentational `CalendarExportPopoverView`, which
 * takes all state and callbacks as props — so no tRPC backend or react-query
 * mocking is needed. The connected `CalendarExportPopover` is the same view
 * fed by live mutations. Task 16 extends this file with a `SubscribeLinks`
 * state.
 */
const meta = {
  title: "Timetable/CalendarExportPopover",
  component: CalendarExportPopoverView,
  tags: ["autodocs"],
  args: {
    open: true,
    onOpenChange: () => undefined,
    token: null,
    origin: "https://afterclass.io",
    needsLinkSharing: false,
    isTurningOnLinkSharing: false,
    isRevoking: false,
    onTurnOnLinkSharing: () => undefined,
    onRevoke: () => undefined,
  },
} satisfies Meta<typeof CalendarExportPopoverView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A token has been minted — feed URL, subscribe and download controls show. */
export const Default: Story = {
  args: {
    token: "sample-ical-token",
  },
};

/** PRIVATE timetable — the inline "Turn on link sharing" notice shows. */
export const NeedsLinkSharing: Story = {
  args: {
    needsLinkSharing: true,
  },
};

/** A token has been minted — the three one-step subscribe buttons show. */
export const SubscribeLinks: Story = {
  args: {
    token: "sample-ical-token",
  },
};
