import { describe, expect, it, vi } from "vitest";
import type { RouterCaller, ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { listFacultiesTool, resolveFacultyId } from "./faculties";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  aiConsent: null,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// list-faculties + resolveFacultyId read through the RouterCaller seam
// (caller.faculties.list), so tests stub the caller — no DB access.

const ROWS = [
  { id: 1, name: "Lee Kong Chian School of Business", acronym: "LKCSB" },
  { id: 2, name: "Yong Pung How School of Law", acronym: "YPHSL" },
  { id: 3, name: "School of Economics", acronym: "SOE" },
  {
    id: 4,
    name: "School of Computing and Information Systems",
    acronym: "SCIS",
  },
  { id: 5, name: "School of Social Sciences", acronym: "SOSS" },
  { id: 6, name: "School of Accountancy", acronym: "SOA" },
  { id: 7, name: "College of Integrative Studies", acronym: "CIS" },
  { id: 8, name: "Yong Pung How School of Law", acronym: "SOL" },
  { id: 9, name: "Center for English Communication", acronym: "CEC" },
];

function makeCaller(listImpl?: () => unknown) {
  return {
    faculties: { list: listImpl ?? (async () => ROWS) },
  } as unknown as ToolContext["caller"];
}

function stubCaller() {
  const list = vi.fn().mockResolvedValue(ROWS);
  const caller = {
    faculties: { list },
  } as unknown as RouterCaller;
  return { caller, list };
}

describe("list-faculties", () => {
  it("is named list-faculties and readOnly", () => {
    expect(listFacultiesTool.name).toBe("list-faculties");
    expect(listFacultiesTool.readOnly).toBe(true);
  });

  it("returns all 9 faculties with id, name, acronym (incl. SCIS -> 4)", async () => {
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller() };
    const result = await listFacultiesTool.run(ctx, {});
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0]!.text) as Array<{
      id: number;
      name: string;
      acronym: string;
    }>;
    expect(parsed).toHaveLength(9);
    expect(parsed).toContainEqual({
      id: 4,
      name: "School of Computing and Information Systems",
      acronym: "SCIS",
    });
    for (const row of parsed) {
      expect(Object.keys(row).sort()).toEqual(["acronym", "id", "name"]);
    }
  });

  it("returns errText when the procedure rejects", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller(failing) };
    const result = await listFacultiesTool.run(ctx, {});
    expect(result.isError).toBe(true);
  });
});

describe("resolveFacultyId", () => {
  it("passes numeric ids through without calling the procedure", async () => {
    const { caller, list } = stubCaller();
    expect(await resolveFacultyId(caller, 4)).toEqual({ ok: true, value: 4 });
    expect(list).not.toHaveBeenCalled();
  });

  it("passes numeric strings through without calling the procedure", async () => {
    const { caller, list } = stubCaller();
    expect(await resolveFacultyId(caller, "4")).toEqual({
      ok: true,
      value: 4,
    });
    expect(list).not.toHaveBeenCalled();
  });

  it("resolves SCIS to 4", async () => {
    const { caller } = stubCaller();
    expect(await resolveFacultyId(caller, "SCIS")).toEqual({
      ok: true,
      value: 4,
    });
  });

  it("resolves acronyms case-insensitively", async () => {
    const { caller } = stubCaller();
    expect(await resolveFacultyId(caller, "scis")).toEqual({
      ok: true,
      value: 4,
    });
    expect(await resolveFacultyId(caller, "Lkcsb")).toEqual({
      ok: true,
      value: 1,
    });
  });

  it("returns a friendly error naming list-faculties for unknown acronyms", async () => {
    const { caller } = stubCaller();
    const result = await resolveFacultyId(caller, "NOPE");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errText).toContain("NOPE");
      expect(result.errText).toContain("list-faculties");
    }
  });

  it("resolveFacultyId resolves SCIS via caller, not db", async () => {
    const caller = {
      faculties: { list: async () => [{ id: 4, acronym: "SCIS" }] },
    };
    const { resolveFacultyId } = await import("./faculties");
    expect(await resolveFacultyId(caller as never, "SCIS")).toEqual({
      ok: true,
      value: 4,
    });
    expect(await resolveFacultyId(caller as never, "nope")).toMatchObject({
      ok: false,
    });
  });
});
