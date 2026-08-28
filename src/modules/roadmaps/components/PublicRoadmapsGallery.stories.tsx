import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import type { ReactNode } from "react";
import { Visibility } from "@/generated/prisma/enums";

import { api } from "@/common/tools/trpc/react";
import type { RouterOutputs } from "@/common/tools/trpc/react";
import { PublicRoadmapsGallery } from "./PublicRoadmapsGallery";

type ListPublicPage = RouterOutputs["roadmaps"]["listPublic"];
type ListPublicItem = ListPublicPage["items"][number];
type FacultiesList = RouterOutputs["faculties"]["list"];

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

// PublicRoadmapsGallery takes no props (see RoadmapsExplorer) — every piece
// of data comes from tRPC. The story mocks at that seam by seeding the
// react-query cache with the exact query keys the gallery's hooks compute.
const GALLERY_INPUT = {
  limit: 12,
  query: undefined,
  facultyId: undefined,
  sort: "newest",
} as const;

const SCIS = {
  id: 4,
  name: "School of Computing and Information Systems",
  acronym: "SCIS",
};
const LKCSB = {
  id: 1,
  name: "Lee Kong Chian School of Business",
  acronym: "LKCSB",
};
const SOSS = { id: 5, name: "School of Social Sciences", acronym: "SOSS" };
const SOL = { id: 2, name: "Yong Pung How School of Law", acronym: "SOL" };

function sampleItem({
  id,
  name,
  description,
  slug,
  facultyId,
  publishedAt,
  viewCount,
  username,
  entryCount,
  voteCount,
  faculty,
}: {
  id: string;
  name: string;
  description: string;
  slug: string;
  facultyId: number | null;
  publishedAt: Date;
  viewCount: number;
  username: string;
  entryCount: number;
  voteCount: number;
  faculty: { id: number; name: string; acronym: string } | null;
}): ListPublicItem {
  return {
    roadmap: {
      id,
      name,
      description,
      slug,
      facultyId,
      visibility: Visibility.PUBLIC,
      publishedAt,
      viewCount,
      shareCount: 0,
      isActive: true,
      userId: `user-${id}`,
      user: { username },
      _count: { entries: entryCount, votes: voteCount },
    },
    ownerUsername: username,
    entryCount,
    voteCount,
    faculty,
  };
}

const SAMPLE_PAGE: ListPublicPage = {
  nextCursor: null,
  items: [
    sampleItem({
      id: "rm-swe",
      name: "Software Engineering Specialisation",
      description:
        "A focused plan covering data structures, software design, and distributed systems fundamentals.",
      slug: "software-engineering-specialisation",
      facultyId: SCIS.id,
      publishedAt: new Date("2026-07-01T00:00:00.000Z"),
      viewCount: 3402,
      username: "alexander",
      entryCount: 24,
      voteCount: 128,
      faculty: SCIS,
    }),
    sampleItem({
      id: "rm-finance",
      name: "Finance & Accounting Double Degree",
      description:
        "A double degree plan balancing corporate finance, accounting, and quantitative methods.",
      slug: "finance-accounting-double-degree",
      facultyId: LKCSB.id,
      publishedAt: new Date("2026-06-20T00:00:00.000Z"),
      viewCount: 2105,
      username: "brenda",
      entryCount: 36,
      voteCount: 89,
      faculty: LKCSB,
    }),
    sampleItem({
      id: "rm-psych",
      name: "Psychology Major Pathway",
      description:
        "A social sciences track with a strong research-methods core and flexible electives.",
      slug: "psychology-major-pathway",
      facultyId: SOSS.id,
      publishedAt: new Date("2026-06-10T00:00:00.000Z"),
      viewCount: 980,
      username: "charlie",
      entryCount: 20,
      voteCount: 45,
      faculty: SOSS,
    }),
    sampleItem({
      id: "rm-law",
      name: "Law & Business Joint Track",
      description:
        "An integrated law and business plan for the YPHSL joint degree programme.",
      slug: "law-business-joint-track",
      facultyId: SOL.id,
      publishedAt: new Date("2026-05-28T00:00:00.000Z"),
      viewCount: 1520,
      username: "dana",
      entryCount: 40,
      voteCount: 67,
      faculty: SOL,
    }),
  ],
};

const SAMPLE_FACULTIES: FacultiesList = [SCIS, LKCSB, SOSS, SOL];

// ---------------------------------------------------------------------------
// tRPC cache seeding (the gallery's only data seam)
// ---------------------------------------------------------------------------

function SeedGalleryData({ children }: { children: ReactNode }) {
  const utils = api.useUtils();
  useState(() => {
    // Keep the seeded queries fresh so Storybook never refetches against a
    // real /api/trpc endpoint while a story is open.
    const updatedAt = Date.now() + 60 * 60 * 1000;
    utils.roadmaps.listPublic.setInfiniteData(
      GALLERY_INPUT,
      { pages: [SAMPLE_PAGE], pageParams: [null] },
      { updatedAt },
    );
    utils.faculties.list.setData(undefined, SAMPLE_FACULTIES, { updatedAt });
  });
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: "Roadmaps/PublicRoadmapsGallery",
  component: PublicRoadmapsGallery,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <SeedGalleryData>
        <Story />
      </SeedGalleryData>
    ),
  ],
} satisfies Meta<typeof PublicRoadmapsGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Default: Story = {};

/**
 * At a ~320px viewport the stats row (courses / likes / views / date) must
 * wrap inside the card rather than pushing the date past its right edge.
 */
export const NarrowViewport: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1", // 320px wide
    },
  },
};
