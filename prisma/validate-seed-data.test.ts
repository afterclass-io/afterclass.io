import { describe, expect, it } from "vitest";

import { assertStrictTimeFormats } from "./validate-seed-data";

describe("assertStrictTimeFormats", () => {
  it("accepts zero-padded HH:MM rows", () => {
    expect(() =>
      assertStrictTimeFormats(
        [{ startTime: "08:15", endTime: "11:30" }],
        "15_class_timings.json",
      ),
    ).not.toThrow();
  });

  it.each(["8:15", "8:15:00 PM", "08:15:00", "25:00", "abc"])(
    "throws with file and row index for %s",
    (bad) => {
      expect(() =>
        assertStrictTimeFormats(
          [
            { startTime: "08:15", endTime: "11:30" },
            { startTime: bad, endTime: "11:30" },
          ],
          "15_class_timings.json",
        ),
      ).toThrow(/15_class_timings\.json.*row 1/);
    },
  );
});
