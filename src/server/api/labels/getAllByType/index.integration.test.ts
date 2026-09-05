import { describe, expect, it } from "vitest";

import { idb as db } from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getAllByType } from "./index";

const router = createTRPCRouter({ getAllByType });

describe("labels.getAllByType (integration)", () => {
  it("returns only labels matching the requested type", async () => {
    const courseLabel = await db.labels.create({
      data: { name: "FAIR_GRADING", typeOf: "COURSE" },
    });
    const profLabel = await db.labels.create({
      data: { name: "FAIR_GRADING", typeOf: "PROFESSOR" },
    });
    const caller = makeCaller(router.createCaller, db);

    const result = await caller.getAllByType({ typeOf: "COURSE" });

    expect(result.some((l) => l.id === courseLabel.id)).toBe(true);
    expect(result.some((l) => l.id === profLabel.id)).toBe(false);
    expect(result.every((l) => l.typeOf === "COURSE")).toBe(true);
  });
});
