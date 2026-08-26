import { describe, expect, it } from "vitest";
import { selectOneClassPerTerm } from "./selectOneClassPerTerm";

interface Timing {
  dayOfWeek: string | null;
  startTime: string;
}
interface Result {
  bidWindow: { acadTermId: string; round: string; window: number };
  class: { id: string; section: string; classTimings: Timing[] };
}

/** Build one bid-result row for a (term, class) with the given timings. */
const mk = (
  termId: string,
  classId: string,
  section: string,
  classTimings: Timing[],
  window = 1,
): Result => ({
  bidWindow: { acadTermId: termId, round: "1", window },
  class: { id: classId, section, classTimings },
});

const ids = (rows: Result[]) => rows.map((r) => r.class.id);

describe("selectOneClassPerTerm", () => {
  it("returns [] for no results", () => {
    expect(selectOneClassPerTerm([], [])).toEqual([]);
  });

  it("keeps every bid window of the only class in a term", () => {
    const rows = [
      mk("T1", "c1", "G1", [{ dayOfWeek: "MON", startTime: "09:00" }], 1),
      mk("T1", "c1", "G1", [{ dayOfWeek: "MON", startTime: "09:00" }], 2),
    ];
    const out = selectOneClassPerTerm(rows, []);
    expect(out).toHaveLength(2);
    expect(ids(out)).toEqual(["c1", "c1"]);
  });

  it("selects independently per term", () => {
    const rows = [
      mk("T1", "c1", "G1", [{ dayOfWeek: "MON", startTime: "09:00" }]),
      mk("T2", "c2", "G1", [{ dayOfWeek: "MON", startTime: "09:00" }]),
    ];
    expect(ids(selectOneClassPerTerm(rows, []))).toEqual(["c1", "c2"]);
  });

  it("picks the class whose timing is closest to the reference", () => {
    const reference = [{ dayOfWeek: "MON", startTime: "09:00" }];
    const rows = [
      mk("T1", "c1", "G1", [{ dayOfWeek: "MON", startTime: "09:30" }]), // score 30
      mk("T1", "c2", "G2", [{ dayOfWeek: "FRI", startTime: "09:00" }]), // score 2880
    ];
    expect(ids(selectOneClassPerTerm(rows, reference))).toEqual(["c1"]);
  });

  it("with no reference timings, ties break by section label order", () => {
    const rows = [
      mk("T1", "c1", "G2", [{ dayOfWeek: "MON", startTime: "09:00" }]),
      mk("T1", "c2", "G1", [{ dayOfWeek: "MON", startTime: "09:00" }]),
    ];
    expect(ids(selectOneClassPerTerm(rows, []))).toEqual(["c2"]);
  });

  it("breaks ties by numeric proximity to referenceSection", () => {
    const rows = [
      mk("T1", "c1", "G1", [{ dayOfWeek: "MON", startTime: "09:00" }]),
      mk("T1", "c2", "G10", [{ dayOfWeek: "MON", startTime: "09:00" }]),
    ];
    // equal scores (no reference); |1-9|=8 vs |10-9|=1 -> G10 wins
    expect(ids(selectOneClassPerTerm(rows, [], "G9"))).toEqual(["c2"]);
  });

  it("falls back to label order when section numbers are non-numeric", () => {
    const rows = [
      mk("T1", "c1", "GA", [{ dayOfWeek: "MON", startTime: "09:00" }]),
      mk("T1", "c2", "GB", [{ dayOfWeek: "MON", startTime: "09:00" }]),
    ];
    expect(ids(selectOneClassPerTerm(rows, [], "GX"))).toEqual(["c1"]);
  });

  it("ranks a class with no timings last", () => {
    const reference = [{ dayOfWeek: "MON", startTime: "09:00" }];
    const rows = [
      mk("T1", "c1", "G1", [{ dayOfWeek: "MON", startTime: "10:00" }]),
      mk("T1", "c2", "G2", []),
    ];
    expect(ids(selectOneClassPerTerm(rows, reference))).toEqual(["c1"]);
  });

  it("scores 0 when every reference timing has a null day", () => {
    const reference = [{ dayOfWeek: null, startTime: "09:00" }];
    const rows = [
      mk("T1", "c1", "G2", [{ dayOfWeek: "MON", startTime: "09:00" }]),
      mk("T1", "c2", "G1", [{ dayOfWeek: "MON", startTime: "09:00" }]),
    ];
    // both score 0 -> section tiebreak -> G1
    expect(ids(selectOneClassPerTerm(rows, reference))).toEqual(["c2"]);
  });

  it("applies the max penalty when a candidate's timings all have null days", () => {
    const reference = [{ dayOfWeek: "MON", startTime: "09:00" }];
    const rows = [
      mk("T1", "c1", "G1", [{ dayOfWeek: null, startTime: "09:00" }]), // penalty 2160
      mk("T1", "c2", "G2", [{ dayOfWeek: "MON", startTime: "10:00" }]), // score 60
    ];
    expect(ids(selectOneClassPerTerm(rows, reference))).toEqual(["c2"]);
  });

  it("treats an unrecognised day string as maximum day distance", () => {
    const reference = [{ dayOfWeek: "MON", startTime: "09:00" }];
    const rows = [
      mk("T1", "c1", "G1", [{ dayOfWeek: "Funday", startTime: "09:00" }]), // dayDist 2 -> 1440
      mk("T1", "c2", "G2", [{ dayOfWeek: "MON", startTime: "12:00" }]), // 180
    ];
    expect(ids(selectOneClassPerTerm(rows, reference))).toEqual(["c2"]);
  });
});
