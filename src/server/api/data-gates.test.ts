import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter, dataProcedure } from "@/server/api/trpc";
import {
  DEFAULT_PUBLIC_DATA,
  type PublicDataDomain,
} from "@/server/ecfg/config";
import { PUBLIC_DATA_PARENTS } from "@/server/ecfg/public-data";

const mockGetEdgeConfig = vi.fn<() => Promise<unknown>>();
vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: () => mockGetEdgeConfig(),
}));

const domains = Object.keys(DEFAULT_PUBLIC_DATA) as PublicDataDomain[];

const router = createTRPCRouter({
  classData: dataProcedure("classData").query(() => "ok"),
  reviews: dataProcedure("reviews").query(() => "ok"),
  courses: dataProcedure("courses").query(() => "ok"),
  professors: dataProcedure("professors").query(() => "ok"),
  publicRoadmaps: dataProcedure("publicRoadmaps").query(() => "ok"),
  coursesAndProfessors: dataProcedure("courses", "professors").query(
    () => "ok",
  ),
});

const anonymous = () => makeCaller(router.createCaller, {}, null);
const signedIn = () =>
  makeCaller(router.createCaller, {}, { user: { id: "user-123" } });

const storeWith = (publicData: Partial<Record<PublicDataDomain, boolean>>) =>
  mockGetEdgeConfig.mockResolvedValue({
    publicData: { ...DEFAULT_PUBLIC_DATA, ...publicData },
  });

/** The store flags that make `domain` effectively public: it and its parents. */
const withParents = (domain: PublicDataDomain) =>
  Object.fromEntries(
    [domain, ...PUBLIC_DATA_PARENTS[domain]].map((d) => [d, true]),
  );

describe("dataProcedure (publicData Edge Config gates)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeWith({});
  });

  describe.each(domains)("%s", (domain) => {
    it("rejects anonymous callers when the domain is private", async () => {
      await expect(anonymous()[domain]()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("allows anonymous callers when the domain and its parents are public", async () => {
      storeWith(withParents(domain));
      await expect(anonymous()[domain]()).resolves.toBe("ok");
    });

    it("stays private while a parent is private", async () => {
      for (const parent of PUBLIC_DATA_PARENTS[domain]) {
        storeWith({ ...withParents(domain), [parent]: false });
        await expect(anonymous()[domain]()).rejects.toMatchObject({
          code: "UNAUTHORIZED",
        });
      }
    });

    it("keeps the other domains private when only this one is public", async () => {
      storeWith(withParents(domain));
      const parents: readonly PublicDataDomain[] = PUBLIC_DATA_PARENTS[domain];
      const others = domains.filter(
        (d) => d !== domain && !parents.includes(d),
      );
      for (const other of others) {
        await expect(anonymous()[other]()).rejects.toMatchObject({
          code: "UNAUTHORIZED",
        });
      }
    });
  });

  it("lets signed-in callers through without reading Edge Config", async () => {
    for (const domain of domains) {
      await expect(signedIn()[domain]()).resolves.toBe("ok");
    }
    expect(mockGetEdgeConfig).not.toHaveBeenCalled();
  });

  it("fails closed when Edge Config cannot be read", async () => {
    mockGetEdgeConfig.mockRejectedValue(new Error("network down"));
    await expect(anonymous().reviews()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("treats a missing publicData section as private", async () => {
    mockGetEdgeConfig.mockResolvedValue({});
    await expect(anonymous().classData()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  describe("multiple domains", () => {
    it("requires every domain to be public", async () => {
      storeWith({ courses: true });
      await expect(anonymous().coursesAndProfessors()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });

      storeWith({ professors: true });
      await expect(anonymous().coursesAndProfessors()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });

      storeWith({ courses: true, professors: true });
      await expect(anonymous().coursesAndProfessors()).resolves.toBe("ok");
    });
  });
});
