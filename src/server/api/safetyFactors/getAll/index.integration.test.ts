import { describe, expect, inject, it } from "vitest";

import { idb as db } from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getAll } from "./index";

const router = createTRPCRouter({ getAll });

describe("safetyFactors.getAll (integration)", () => {
  it("returns seeded safety factor rows", async () => {
    const acadTermId = inject("acadTermId");
    // Random within PK ([acadTermId, predictionType, beatsPercentage,
    // multiplierType]) so a rerun against a surviving container doesn't P2002.
    const beatsPercentage = 1 + Math.floor(Math.random() * 99);
    await db.safetyFactor.create({
      data: {
        acadTermId,
        predictionType: "MEDIAN",
        beatsPercentage,
        multiplierType: "EMPIRICAL",
        multiplier: 1.25,
      },
    });
    const caller = makeCaller(router.createCaller, db);

    const result = await caller.getAll();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          acadTermId,
          predictionType: "MEDIAN",
          beatsPercentage,
          multiplierType: "EMPIRICAL",
          multiplier: 1.25,
        }),
      ]),
    );
  });
});
