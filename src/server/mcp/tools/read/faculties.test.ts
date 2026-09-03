import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { listFacultiesTool, resolveFacultyId } from "./faculties";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// list-faculties + resolveFacultyId read the faculties table directly (same
// pattern as get-me in account.ts), so mock the store module with vi.hoisted
// fns the same way account.test.ts does.
const { facultiesFindMany } = vi.hoisted(() => ({
  facultiesFindMany: vi.fn() as Mock,
}));

vi.mock("@/server/db", () => ({
  db: { faculties: { findMany: facultiesFindMany } },
}));

const ROWS = [
  { id: 1, name: "Lee Kong Chian School of Business", acronym: "LKCSB" },
  { id: 2, name: "Yong Pung How School of Law", acronym: "YPHSL" },
  { id: 3, name: "School of Economics", acronym: "SOE" },
  { id: 4, name: "School of Computing and Information Systems", acronym: "SCIS" },
  { id: 5, name: "School of Social Sciences", acronym: "SOSS" },
  { id: 6, name: "School of Accountancy", acronym: "SOA" },
  { id: 7, name: "College of Integrative Studies", acronym: "CIS" },
  { id: 8, name: "Yong Pung How School of Law", acronym: "SOL" },
  { id: 9, name: "Center for English Communication", acronym: "CEC" },
];

function makeCaller() {
  return {} as unknown as ToolContext["caller"];
}

describe("list-faculties", () => {
  beforeEach(() => {
    facultiesFindMany.mockReset();
    facultiesFindMany.mockResolvedValue(ROWS);
  });

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

  it("returns errText when the query rejects", async () => {
    facultiesFindMany.mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller() };
    const result = await listFacultiesTool.run(ctx, {});
    expect(result.isError).toBe(true);
  });
});

describe("resolveFacultyId", () => {
  beforeEach(() => {
    facultiesFindMany.mockReset();
    facultiesFindMany.mockResolvedValue(ROWS);
  });

  it("passes numeric ids through without a db lookup", async () => {
    expect(await resolveFacultyId(4)).toEqual({ ok: true, value: 4 });
    expect(facultiesFindMany).not.toHaveBeenCalled();
  });

  it("resolves SCIS to 4", async () => {
    expect(await resolveFacultyId("SCIS")).toEqual({ ok: true, value: 4 });
  });

  it("resolves acronyms case-insensitively", async () => {
    expect(await resolveFacultyId("scis")).toEqual({ ok: true, value: 4 });
    expect(await resolveFacultyId("Lkcsb")).toEqual({ ok: true, value: 1 });
  });

  it("returns a friendly error naming list-faculties for unknown acronyms", async () => {
    const result = await resolveFacultyId("NOPE");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errText).toContain("NOPE");
      expect(result.errText).toContain("list-faculties");
    }
  });
});
