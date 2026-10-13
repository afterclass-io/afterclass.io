import { describe, expect, it } from "vitest";
import { countQueries, idb as db } from "./integration-test-helpers";

describe("countQueries helper", () => {
  it("counts single and multiple queries accurately", async () => {
    const single = await countQueries(db, async () => {
      return db.universities.findMany({ take: 1 });
    });
    expect(single.statements).toBe(1);
    expect(single.queries).toHaveLength(1);
    expect(single.events).toHaveLength(1);
    expect(single.events[0]?.query).toBeDefined();

    const multiple = await countQueries(db, async () => {
      await db.universities.findMany({ take: 1 });
      await db.universities.findMany({ take: 1 });
      await db.universities.findMany({ take: 1 });
      return "done";
    });
    expect(multiple.result).toBe("done");
    expect(multiple.statements).toBe(3);
    expect(multiple.queries).toHaveLength(3);
  });

  it("cleans up event listener after execution", async () => {
    await countQueries(db, async () => {
      await db.universities.findMany({ take: 1 });
    });

    const second = await countQueries(db, async () => {
      await db.universities.findMany({ take: 1 });
    });
    expect(second.statements).toBe(1);
  });
});
