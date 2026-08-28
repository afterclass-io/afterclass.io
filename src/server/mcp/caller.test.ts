import { describe, expect, it, vi } from "vitest";
import { createCallerForUser } from "./caller";
import type { SessionUser } from "@/server/auth/config";

// `server-only` is a Next.js build-time guard that throws when imported
// outside a Next.js server bundle. Vitest is neither, so stub it as a
// no-op (same pattern as `src/common/tools/acad-term.test.ts`).
vi.mock("server-only", () => ({}));

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

describe("createCallerForUser", () => {
  it("returns a context with the user and a working caller", () => {
    const ctx = createCallerForUser(fakeUser);
    expect(ctx.user).toBe(fakeUser);
    expect(typeof ctx.caller.timetable.listMine).toBe("function");
    expect(typeof ctx.caller.roadmaps.listMine).toBe("function");
    expect(typeof ctx.caller.sharing.setVisibility).toBe("function");
  });
});
