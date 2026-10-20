import { renderToStaticMarkup } from "react-dom/server";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  canViewData: vi.fn<(session: unknown, ...domains: string[]) => boolean>(),
  isDataPublic: vi.fn<(...domains: string[]) => boolean>(),
  getById: vi.fn(),
  getSharedRoadmap: vi.fn(),
  getSharedTimetable: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ auth: m.auth }));
vi.mock("@/server/ecfg/public-data", () => ({
  canViewData: async (session: unknown, ...domains: string[]) =>
    m.canViewData(session, ...domains),
  isDataPublic: async (...domains: string[]) => m.isDataPublic(...domains),
}));
vi.mock("@/common/tools/trpc/server", () => ({
  api: {
    roadmaps: { getById: m.getById },
    sharing: {
      getSharedRoadmap: m.getSharedRoadmap,
      getSharedTimetable: m.getSharedTimetable,
    },
  },
}));
vi.mock("@/common/components/auth-wall", () => ({
  AuthWall: ({ feature }: { feature: string }) => (
    <div data-stub="wall">{feature}</div>
  ),
}));
vi.mock("@/modules/roadmaps/components/RoadmapsExplorer", () => ({
  RoadmapsExplorer: () => <div data-stub="explorer" />,
}));
vi.mock("@/modules/roadmaps/components/ReadOnlyRoadmapBody", () => ({
  toRoadmapEntries: () => [],
}));
vi.mock("./[id]/PublicRoadmapView", () => ({
  PublicRoadmapView: () => <div data-stub="public-roadmap" />,
}));
vi.mock("../share/roadmap/[token]/SharedRoadmapView", () => ({
  SharedRoadmapView: () => <div data-stub="shared-roadmap" />,
}));
vi.mock("../share/timetable/[token]/SharedTimetableView", () => ({
  SharedTimetableView: () => <div data-stub="shared-timetable" />,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
}));

import RoadmapsPage, { generateMetadata as roadmapsMetadata } from "./page";
import PublicRoadmapPage, {
  generateMetadata as roadmapMetadata,
} from "./[id]/page";
import SharedRoadmapPage from "../share/roadmap/[token]/page";
import SharedTimetablePage from "../share/timetable/[token]/page";

const render = (jsx: React.ReactElement) => renderToStaticMarkup(jsx);
const idProps = { params: Promise.resolve({ id: "r1" }) };
const tokenProps = { params: Promise.resolve({ token: "tok" }) };
const signedIn = { user: { id: "u1" } };

describe("roadmap and share pages gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.auth.mockResolvedValue(null);
    m.canViewData.mockImplementation((session) => Boolean(session));
    m.isDataPublic.mockReturnValue(false);
    m.getById.mockResolvedValue({
      roadmap: {
        id: "r1",
        name: "Plan",
        description: null,
        publishedAt: null,
        viewCount: 0,
        shareCount: 0,
      },
      ownerUsername: "u",
      ownerFaculty: null,
      voteCount: 0,
      viewerHasVoted: false,
      entries: [],
    });
  });

  describe("/roadmaps", () => {
    const props = { searchParams: Promise.resolve({}) };

    it("walls the public explorer and noindexes it while publicRoadmaps is private", async () => {
      expect(render(await RoadmapsPage(props))).toContain('data-stub="wall"');
      expect(await roadmapsMetadata()).toMatchObject({
        robots: { index: false, follow: false },
      });
    });

    it("renders the explorer and stays indexable when publicRoadmaps is public", async () => {
      m.canViewData.mockReturnValue(true);
      m.isDataPublic.mockReturnValue(true);
      expect(render(await RoadmapsPage(props))).toContain(
        'data-stub="explorer"',
      );
      expect((await roadmapsMetadata()).robots).toBeUndefined();
    });

    it("renders the explorer for a signed-in viewer", async () => {
      m.auth.mockResolvedValue(signedIn);
      expect(render(await RoadmapsPage(props))).toContain(
        'data-stub="explorer"',
      );
    });
  });

  describe("/roadmaps/[id]", () => {
    it("walls and noindexes without calling the endpoint when private", async () => {
      expect(render(await PublicRoadmapPage(idProps))).toContain(
        'data-stub="wall"',
      );
      expect(await roadmapMetadata(idProps)).toMatchObject({
        robots: { index: false, follow: false },
      });
      expect(m.getById).not.toHaveBeenCalled();
    });

    it("renders the roadmap when public", async () => {
      m.canViewData.mockReturnValue(true);
      expect(render(await PublicRoadmapPage(idProps))).toContain(
        'data-stub="public-roadmap"',
      );
      expect((await roadmapMetadata(idProps)).robots).toBeUndefined();
    });
  });

  describe("/share/roadmap/[token]", () => {
    it("walls when the endpoint answers UNAUTHORIZED", async () => {
      m.getSharedRoadmap.mockRejectedValue(
        new TRPCError({ code: "UNAUTHORIZED" }),
      );
      expect(render(await SharedRoadmapPage(tokenProps))).toContain(
        'data-stub="wall"',
      );
    });

    it("renders the roadmap when the endpoint allows it", async () => {
      m.getSharedRoadmap.mockResolvedValue({
        roadmap: { id: "r1", name: "Plan" },
        ownerUsername: "u",
        entries: [],
      });
      expect(render(await SharedRoadmapPage(tokenProps))).toContain(
        'data-stub="shared-roadmap"',
      );
    });
  });

  describe("/share/timetable/[token]", () => {
    it("walls anonymous viewers without calling the endpoint", async () => {
      expect(render(await SharedTimetablePage(tokenProps))).toContain(
        'data-stub="wall"',
      );
      expect(m.getSharedTimetable).not.toHaveBeenCalled();
    });

    it("renders the timetable for a signed-in viewer", async () => {
      m.auth.mockResolvedValue(signedIn);
      m.getSharedTimetable.mockResolvedValue({
        timetable: { name: "T", ownerUsername: "u" },
        slots: [],
      });
      expect(render(await SharedTimetablePage(tokenProps))).toContain(
        'data-stub="shared-timetable"',
      );
    });
  });
});
