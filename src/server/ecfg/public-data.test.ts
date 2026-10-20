import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PUBLIC_DATA, type PublicDataDomain } from "./config";

const m = vi.hoisted(
  (): { publicData: Record<string, boolean>; fail: boolean } => ({
    publicData: {},
    fail: false,
  }),
);

vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: async () => {
    if (m.fail) throw new Error("store down");
    return { publicData: m.publicData };
  },
}));

import { canViewData, isDataPublic, resolvePublicData } from "./public-data";

const ALL_PUBLIC = {
  courses: true,
  professors: true,
  classData: true,
  reviews: true,
  publicRoadmaps: true,
} satisfies Record<PublicDataDomain, boolean>;

describe("resolvePublicData", () => {
  it("keeps every domain public when every flag is on", () => {
    expect(resolvePublicData(ALL_PUBLIC)).toEqual(ALL_PUBLIC);
  });

  it("keeps every domain private by default", () => {
    expect(resolvePublicData({ ...DEFAULT_PUBLIC_DATA })).toEqual(
      DEFAULT_PUBLIC_DATA,
    );
  });

  it.each<
    [string, Partial<Record<PublicDataDomain, boolean>>, PublicDataDomain[]]
  >([
    // A private parent hides its children, whatever their own flag says.
    [
      "courses off",
      { courses: false },
      ["classData", "reviews", "publicRoadmaps"],
    ],
    ["professors off", { professors: false }, ["classData"]],
    // A child flag never reaches up: the parents stay public.
    ["reviews off", { reviews: false }, []],
    ["classData off", { classData: false }, []],
  ])("%s also hides %j", (_, off, hiddenChildren) => {
    const effective = resolvePublicData({ ...ALL_PUBLIC, ...off });
    for (const domain of Object.keys(ALL_PUBLIC) as PublicDataDomain[]) {
      const expected = !(domain in off) && !hiddenChildren.includes(domain);
      expect(effective[domain], domain).toBe(expected);
    }
  });

  it("keeps reviews public when only professors is off", () => {
    const effective = resolvePublicData({ ...ALL_PUBLIC, professors: false });
    expect(effective.reviews).toBe(true);
    expect(effective.courses).toBe(true);
  });
});

describe("isDataPublic / canViewData", () => {
  beforeEach(() => {
    m.publicData = { ...ALL_PUBLIC };
    m.fail = false;
  });

  it("applies the hierarchy to the stored flags", async () => {
    m.publicData = { ...ALL_PUBLIC, courses: false };
    expect(await isDataPublic("reviews")).toBe(false);
    expect(await isDataPublic("professors")).toBe(true);
  });

  it("needs every listed domain", async () => {
    m.publicData = { ...ALL_PUBLIC, professors: false };
    expect(await isDataPublic("courses", "professors")).toBe(false);
  });

  it("fails closed when the store read throws", async () => {
    m.fail = true;
    expect(await isDataPublic("courses")).toBe(false);
  });

  it("lets a signed-in user see every domain", async () => {
    m.publicData = { ...DEFAULT_PUBLIC_DATA };
    expect(await canViewData({ user: { id: "u1" } }, "reviews")).toBe(true);
    expect(await canViewData(null, "reviews")).toBe(false);
  });
});
