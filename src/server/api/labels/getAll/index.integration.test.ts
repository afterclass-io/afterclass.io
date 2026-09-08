import { describe, expect, it } from "vitest";

import { idb as db } from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getAll } from "./index";

const router = createTRPCRouter({ getAll });

describe("labels.getAll (integration)", () => {
  it("returns seeded labels with exactly the selected columns", async () => {
    const label = await db.labels.create({
      data: { name: "PRACTICAL", typeOf: "COURSE" },
    });
    const caller = makeCaller(router.createCaller, db);

    const result = await caller.getAll();

    const seeded = result.find((l) => l.id === label.id);
    expect(seeded).toEqual({
      id: label.id,
      name: "PRACTICAL",
      typeOf: "COURSE",
    });
  });
});
