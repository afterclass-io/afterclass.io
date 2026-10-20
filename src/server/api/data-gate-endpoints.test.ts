import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/server/api/trpc-test-helpers";
import { createCaller } from "@/server/api/root";
import {
  DEFAULT_PUBLIC_DATA,
  type PublicDataDomain,
} from "@/server/ecfg/config";

const mockGetEdgeConfig = vi.fn<() => Promise<unknown>>();
vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: () => mockGetEdgeConfig(),
}));

// The per-IP throttle is DB-backed; stub the budget so only the gate is tested.
vi.mock("@/server/assistant/budget", () => ({
  checkBudget: vi.fn().mockResolvedValue({ ok: true, retryAfterSeconds: 0 }),
}));

type Gate = { domains: PublicDataDomain[]; paths: string[] };

/** Spec §5.3: every gated endpoint, grouped by the domains it requires. */
const gates: Gate[] = [
  {
    domains: ["classData"],
    paths: [
      "classes.getAll",
      "classes.getAllByCourseId",
      "classes.resolveByCodeSections",
      "bidResults.getBy",
      "bidResults.getByCourseProfessor",
      "bidResults.getVacanciesByClassIds",
      "bidPredictions.getBy",
      "bidPredictions.getByClassIds",
      "bidWindows.getByAcadTerm",
      "bidWindows.getCurrentWindow",
      "timetable.searchCourses",
      "timetable.searchCoursesByTerms",
      "professors.getProfessorsByClassId",
    ],
  },
  {
    domains: ["courses"],
    paths: [
      "courses.getAllByUniAbbrv",
      "courses.getByCourseCode",
      "courses.getEnrolmentRequirementsByCodes",
      "search.courses",
      "search.courseResults",
      "roadmaps.searchCourses",
    ],
  },
  {
    domains: ["professors"],
    paths: [
      "professors.getAllByUniAbbrv",
      "professors.getBySlug",
      "professors.search",
      "search.professors",
      "search.professorResults",
    ],
  },
  {
    domains: ["courses", "professors"],
    paths: [
      "courses.getByProfSlug",
      "courses.countByProfSlug",
      "professors.getByCourseCode",
      "professors.countByCourseCode",
    ],
  },
  {
    domains: ["reviews"],
    paths: [
      "reviews.getAll",
      "reviews.getByCourseCode",
      "reviews.getByProfSlug",
      "reviews.getMetadataForCourse",
      "reviews.getMetadataForProf",
      "reviewVotes.count",
    ],
  },
  {
    domains: ["publicRoadmaps"],
    paths: [
      "roadmaps.listPublic",
      "roadmaps.getById",
      "roadmapVotes.count",
      "roadmapReactions.getByRoadmapId",
      "roadmaps.recordView",
      "roadmaps.recordShare",
    ],
  },
];

const cases = gates.flatMap(({ domains, paths }) =>
  paths.map((path) => ({ path, domains })),
);

/**
 * A db whose every access throws, so a call that passes the gate fails with
 * something other than UNAUTHORIZED.
 */
const exploding = new Proxy(
  {},
  {
    get() {
      throw new Error("db reached");
    },
  },
);

const anonymous = () =>
  createCaller({
    db: exploding,
    session: null,
    headers: new Headers(),
  } as never);

const callPath = (path: string) => {
  const procedure = path
    .split(".")
    .reduce<unknown>((node, key) => (node as never)[key], anonymous());
  return (procedure as (input?: unknown) => Promise<unknown>)(undefined);
};

const storeWith = (publicData: Partial<Record<PublicDataDomain, boolean>>) =>
  mockGetEdgeConfig.mockResolvedValue({
    publicData: { ...DEFAULT_PUBLIC_DATA, ...publicData },
  });

describe("endpoint data gates (spec §5.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeWith({});
  });

  it.each(cases)(
    "$path rejects anonymous callers while $domains is private",
    async ({ path }) => {
      await expect(callPath(path)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    },
  );

  it.each(cases)(
    "$path lets anonymous callers past the gate once $domains is public",
    async ({ path, domains }) => {
      storeWith(Object.fromEntries(domains.map((d) => [d, true])));
      await expect(callPath(path)).rejects.not.toMatchObject({
        code: "UNAUTHORIZED",
      });
    },
  );
});
