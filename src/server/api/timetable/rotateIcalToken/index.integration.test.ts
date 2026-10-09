import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  idb as db,
  seedAcadTerm,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getOrCreateIcalToken } from "@/server/api/timetable/getOrCreateIcalToken";
import { rotateIcalToken } from "./index";
import { getFeedData } from "@/server/api/timetable/getFeedData";

const router = createTRPCRouter({
  getOrCreateIcalToken,
  rotateIcalToken,
});

describe("timetable.rotateIcalToken (integration)", () => {
  it("rotates token: old token returns null and new token returns feed data", async () => {
    const user = await seedUser(db);
    const term = await seedAcadTerm(db, {
      endDt: new Date(Date.now() + 86_400_000 * 30),
    });

    const timetable = await db.userTimetable.create({
      data: {
        userId: user.id,
        acadTermId: term.id,
        name: "My Calendar",
        visibility: "UNLISTED",
      },
    });

    const caller = makeCaller(router.createCaller, db, {
      user: { id: user.id },
    });

    const { icalToken: oldToken } = await caller.getOrCreateIcalToken({
      timetableId: timetable.id,
    });
    expect(oldToken).toBeDefined();

    const initialFeed = await getFeedData(oldToken, db);
    expect(initialFeed).not.toBeNull();
    expect(initialFeed?.timetableName).toBe("My Calendar");

    const { icalToken: newToken } = await caller.rotateIcalToken({
      timetableId: timetable.id,
    });
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);

    const oldFeed = await getFeedData(oldToken, db);
    expect(oldFeed).toBeNull();

    const newFeed = await getFeedData(newToken, db);
    expect(newFeed).not.toBeNull();
    expect(newFeed?.timetableName).toBe("My Calendar");
  });
});
