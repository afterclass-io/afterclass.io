import { describe, it, expect } from "vitest";
import {
  buildSpineTerms,
  layoutTimeline,
  SPINE_GAP_X,
  SPINE_Y,
  COURSE_START_Y,
  COURSE_GAP_Y,
  PADDING_X,
} from "./timeline-layout";
import type { Entry } from "./conflicts";

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

const mkEntry = (overrides: Partial<Entry> = {}): Entry => ({
  courseId: "course-1",
  courseCode: "ACCT101",
  courseName: "Financial Accounting",
  creditUnits: 1.0,
  yearNumber: 1,
  term: "T1",
  ...overrides,
});

// ---------------------------------------------------------------------------
// buildSpineTerms
// ---------------------------------------------------------------------------

describe("buildSpineTerms", () => {
  it("returns an empty array for no entries", () => {
    expect(buildSpineTerms([])).toEqual([]);
  });

  it("spans every term of every year from Y1 to the highest used year", () => {
    const entries = [mkEntry({ yearNumber: 2, term: "T1" })];
    const spine = buildSpineTerms(entries);

    expect(spine.map((s) => s.label)).toEqual([
      "Y1T1",
      "Y1T2",
      "Y1T3A",
      "Y1T3B",
      "Y2T1",
      "Y2T2",
      "Y2T3A",
      "Y2T3B",
    ]);
  });

  it("keeps empty terms on the spine so the chain is unbroken", () => {
    const entries = [mkEntry({ yearNumber: 1, term: "T3B" })];
    const spine = buildSpineTerms(entries);

    // Y1T1/Y1T2/Y1T3A have no entries but must still appear
    expect(spine).toHaveLength(4);
    expect(spine.map((s) => s.term)).toEqual(["T1", "T2", "T3A", "T3B"]);
  });
});

// ---------------------------------------------------------------------------
// layoutTimeline
// ---------------------------------------------------------------------------

describe("layoutTimeline", () => {
  it("returns no nodes or edges for empty entries", () => {
    const layout = layoutTimeline([]);
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
  });

  it("places spine nodes left-to-right in term order", () => {
    const layout = layoutTimeline([mkEntry({ yearNumber: 1, term: "T1" })]);
    const termNodes = layout.nodes.filter((n) => n.kind === "term");

    expect(termNodes).toHaveLength(4);
    termNodes.forEach((node, i) => {
      expect(node.position).toEqual({
        x: PADDING_X + i * SPINE_GAP_X,
        y: SPINE_Y,
      });
    });
  });

  it("connects consecutive term nodes with spine edges", () => {
    const layout = layoutTimeline([mkEntry({ yearNumber: 1, term: "T1" })]);
    const spineEdges = layout.edges.filter((e) => e.kind === "spine");

    expect(spineEdges).toHaveLength(3);
    expect(spineEdges[0]).toMatchObject({
      source: "term-1-T1",
      target: "term-1-T2",
    });
    expect(spineEdges[2]).toMatchObject({
      source: "term-1-T3A",
      target: "term-1-T3B",
    });
  });

  it("connects the spine across year boundaries", () => {
    const layout = layoutTimeline([mkEntry({ yearNumber: 2, term: "T2" })]);
    const spineEdges = layout.edges.filter((e) => e.kind === "spine");

    // 8 terms → 7 spine edges, including Y1T3B → Y2T1
    expect(spineEdges).toHaveLength(7);
    expect(
      spineEdges.some(
        (e) => e.source === "term-1-T3B" && e.target === "term-2-T1",
      ),
    ).toBe(true);
  });

  it("stacks a term's courses below their own term node", () => {
    const entries = [
      mkEntry({ courseId: "c1", courseCode: "A", yearNumber: 1, term: "T2" }),
      mkEntry({ courseId: "c2", courseCode: "B", yearNumber: 1, term: "T2" }),
      mkEntry({ courseId: "c3", courseCode: "C", yearNumber: 1, term: "T1" }),
    ];
    const layout = layoutTimeline(entries);
    const courseNodes = layout.nodes.filter((n) => n.kind === "course");

    // Y1T2 is spine index 1
    const t2x = PADDING_X + 1 * SPINE_GAP_X;
    const t2Courses = courseNodes.filter((n) => n.position.x === t2x);
    expect(t2Courses.map((n) => n.position.y)).toEqual([
      COURSE_START_Y,
      COURSE_START_Y + COURSE_GAP_Y,
    ]);

    // Y1T1's course sits under spine index 0
    const t1Course = courseNodes.find((n) => n.entry?.courseCode === "C");
    expect(t1Course?.position).toEqual({ x: PADDING_X, y: COURSE_START_Y });
  });

  it("links every course to its term node and never to another course", () => {
    const entries = [
      mkEntry({ courseId: "c1", courseCode: "A", yearNumber: 1, term: "T2" }),
      mkEntry({ courseId: "c2", courseCode: "B", yearNumber: 1, term: "T2" }),
      mkEntry({ courseId: "c3", courseCode: "C", yearNumber: 1, term: "T1" }),
    ];
    const layout = layoutTimeline(entries);
    const courseEdges = layout.edges.filter((e) => e.kind === "term-course");

    expect(courseEdges).toHaveLength(3);
    for (const edge of courseEdges) {
      expect(edge.source).toMatch(/^term-/);
      expect(edge.target).toMatch(/^course-/);
    }
    // Each course edge originates from the term the course belongs to
    const t2Edges = courseEdges.filter((e) => e.source === "term-1-T2");
    expect(t2Edges).toHaveLength(2);
  });

  it("reports a maxY covering the deepest course row", () => {
    const entries = [
      mkEntry({ courseId: "c1", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "c2", yearNumber: 1, term: "T1" }),
      mkEntry({ courseId: "c3", yearNumber: 1, term: "T1" }),
    ];
    const layout = layoutTimeline(entries);

    expect(layout.maxY).toBe(COURSE_START_Y + 2 * COURSE_GAP_Y);
  });
});
