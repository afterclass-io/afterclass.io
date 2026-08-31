import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import type { ReactNode } from "react";

import { api } from "@/common/tools/trpc/react";
import type { RouterOutputs } from "@/common/tools/trpc/react";
import { BidDialog } from "./BidDialog";
import type { UserBidRow } from "./BidDialog";

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const ACAD_TERM_ID = "AY202425T2";

const WINDOWS: RouterOutputs["timetable"]["getBidWindows"] = [
  {
    id: 37,
    round: "1",
    window: 1,
    opensAt: new Date("2026-08-01T00:00:00.000Z"),
    closesAt: new Date("2026-08-15T00:00:00.000Z"),
    resultsAt: new Date("2026-08-20T00:00:00.000Z"),
  },
  {
    id: 38,
    round: "1",
    window: 2,
    opensAt: new Date("2026-08-16T00:00:00.000Z"),
    closesAt: new Date("2026-08-30T00:00:00.000Z"),
    resultsAt: new Date("2026-09-05T00:00:00.000Z"),
  },
];

const ACCT102_COURSE: RouterOutputs["timetable"]["searchCourses"][number] = {
  id: "course-acct102",
  code: "ACCT102",
  name: "Management Accounting",
  creditUnits: 1,
  sections: [
    {
      classId: "class-g1",
      section: "G1",
      professorName: "Dr. Tan",
      timings: [
        {
          dayOfWeek: "MON",
          startTime: "10:00",
          endTime: "12:00",
          venue: "SOE-SR2-1",
        },
      ],
      examTimings: [
        {
          date: new Date("2026-11-30T00:00:00.000Z"),
          startTime: "09:00",
          endTime: "11:00",
          venue: "SOE-SR2-1",
        },
      ],
    },
    {
      classId: "class-g2",
      section: "G2",
      professorName: "Dr. Tan",
      timings: [
        {
          dayOfWeek: "WED",
          startTime: "14:00",
          endTime: "16:00",
          venue: "SOE-SR2-2",
        },
      ],
      examTimings: [],
    },
  ],
};

const CLASS_BIDS: RouterOutputs["userBids"]["getByClassIds"] = [
  {
    id: "bid-1",
    userId: "user-1",
    classId: "class-g1",
    bidWindowId: 37,
    bidAmount: 50,
    notes: "must-have for my major",
    status: "PLANNED",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    bidWindow: {
      round: "1",
      window: 1,
      resultsAt: new Date("2026-08-20T00:00:00.000Z"),
    },
  },
];

// The full Prisma-included row is impractical to author by hand in a story;
// only the fields the BidPredictionPanel reads are populated.
const SAMPLE_PREDICTION = {
  classId: "class-g1",
  bidWindowId: 37,
  modelVersion: "v1",
  clfHasBidsProbability: 0.92,
  clfConfidenceScore: 0.88,
  medianPredicted: 46,
  medianUncertainty: 5,
  minPredicted: 41,
  minUncertainty: 4,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  class: { id: "class-g1" },
  bidWindow: {
    id: 37,
    acadTermId: ACAD_TERM_ID,
    round: "1",
    window: 1,
    opensAt: new Date("2026-08-01T00:00:00.000Z"),
    closesAt: new Date("2026-08-15T00:00:00.000Z"),
    resultsAt: new Date("2026-08-20T00:00:00.000Z"),
  },
} as unknown as RouterOutputs["bidPredictions"]["getBy"];

const EDIT_BID: UserBidRow = {
  id: "bid-1",
  classId: "class-g1",
  bidWindowId: 37,
  bidAmount: 50,
  notes: "must-have for my major",
  status: "PLANNED",
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  bidWindow: {
    acadTermId: ACAD_TERM_ID,
    round: "1",
    window: 1,
  },
  courseCode: "ACCT102",
  courseName: "Management Accounting",
  section: "G1",
  professorName: "Dr. Tan",
};

// ---------------------------------------------------------------------------
// tRPC cache seeding (the dialog's only data seam)
// ---------------------------------------------------------------------------

function SeedBidDialogData({ children }: { children: ReactNode }) {
  const utils = api.useUtils();
  useState(() => {
    // Keep the seeded queries fresh so Storybook never refetches against a
    // real /api/trpc endpoint while a story is open.
    const updatedAt = Date.now() + 60 * 60 * 1000;
    utils.timetable.getBidWindows.setData({ acadTermId: ACAD_TERM_ID }, WINDOWS, { updatedAt });
    utils.timetable.searchCourses.setData(
      { acadTermId: ACAD_TERM_ID, query: "ACCT102" },
      [ACCT102_COURSE],
      { updatedAt },
    );
    utils.userBids.getByClassIds.setData({ classIds: ["class-g1"] }, CLASS_BIDS, { updatedAt });
    utils.bidPredictions.getBy.setData({ classId: "class-g1" }, SAMPLE_PREDICTION, { updatedAt });
    utils.bidPredictions.getBy.setData({ classId: "class-g2" }, null, {
      updatedAt,
    });
    utils.safetyFactors.getAll.setData(undefined, [], { updatedAt });
    // Professor slug backing the "Professor Reviews" destination link.
    utils.professors.getProfessorsByClassId.setData(
      { classId: "class-g1" },
      [{ name: "Dr. Tan", slug: "dr-tan" }],
      { updatedAt },
    );
  });
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: "Timetable/BidDialog",
  component: BidDialog,
  tags: ["autodocs"],
  args: {
    acadTermId: ACAD_TERM_ID,
    isOpen: true,
    onClose: () => undefined,
  },
  decorators: [
    (Story) => (
      <SeedBidDialogData>
        <div className="w-[36rem]">
          <Story />
        </div>
      </SeedBidDialogData>
    ),
  ],
} satisfies Meta<typeof BidDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Add mode with no course selected yet — only the picker is visible. */
export const AddEmpty: Story = {
  args: {
    mode: "add",
  },
};

/** Add mode with a course + section already chosen — every section visible. */
export const AddWithClassSelected: Story = {
  args: {
    mode: "add",
    classId: "class-g1",
    courseCode: "ACCT102",
    section: "G1",
  },
};

/** Edit mode — every field prefilled from the bid. */
export const EditExistingBid: Story = {
  args: {
    mode: "edit",
    bid: EDIT_BID,
  },
};

/** Class mode (slot card / class cells) — picker hidden, remove retained. */
export const ClassMode: Story = {
  args: {
    mode: "class",
    classId: "class-g1",
    courseCode: "ACCT102",
    section: "G1",
  },
};

/**
 * Class mode with the destination selector visible under the class info
 * card — all three links (Historical Data, Course Reviews, Professor
 * Reviews) route to the existing destination pages.
 */
export const WithDestinationSelector: Story = {
  args: {
    mode: "class",
    classId: "class-g1",
    courseCode: "ACCT102",
    section: "G1",
  },
};
