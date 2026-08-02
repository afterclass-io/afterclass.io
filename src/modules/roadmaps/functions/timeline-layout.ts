/**
 * Pure layout math for the roadmap timeline's "lineage" view.
 *
 * Term nodes form a horizontal spine (Y1T1 → Y1T2 → … → YnT3B), each
 * consecutive pair connected by an edge. Every course hangs directly below
 * its own term node, connected by an edge from the term node — never
 * course-to-course, so no course looks like it "leads" another.
 *
 * All functions are pure — no side effects, no React, no ReactFlow imports —
 * so the layout is unit-testable without a DOM.
 */

import type { Entry } from "./conflicts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpineTerm = {
  /** Stable key, e.g. "1-T1" */
  key: string;
  yearNumber: number;
  term: string;
  /** Display label, e.g. "Y1T1" */
  label: string;
};

export type TimelineLayoutNode = {
  id: string;
  kind: "term" | "course";
  position: { x: number; y: number };
  /** Present on term nodes */
  label?: string;
  /** Present on course nodes */
  entry?: Entry;
};

export type TimelineLayoutEdge = {
  id: string;
  source: string;
  target: string;
  /** "spine" connects consecutive term nodes; "term-course" fans out to courses */
  kind: "spine" | "term-course";
};

export type TimelineLayout = {
  nodes: TimelineLayoutNode[];
  edges: TimelineLayoutEdge[];
  /** Lowest y extent of the layout (for container sizing) */
  maxY: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Term order within a year, matching the roadmap grid */
export const TIMELINE_TERMS = ["T1", "T2", "T3A", "T3B"] as const;

/** Horizontal distance between consecutive spine (term) nodes */
export const SPINE_GAP_X = 220;

/** Vertical distance between course nodes stacked under a term */
export const COURSE_GAP_Y = 96;

/** Left padding for the first spine node */
export const PADDING_X = 40;

/** Y position of the spine row */
export const SPINE_Y = 20;

/** Y position of the first course row below the spine */
export const COURSE_START_Y = 96;

// ---------------------------------------------------------------------------
// Spine construction
// ---------------------------------------------------------------------------

/**
 * Build the ordered spine terms for the roadmap's year range: every term of
 * every year from Y1 up to the highest year used by any entry. Terms without
 * courses stay on the spine so the lineage chain is never broken.
 */
export function buildSpineTerms(entries: Entry[]): SpineTerm[] {
  if (entries.length === 0) return [];

  const maxYear = Math.max(...entries.map((e) => e.yearNumber));
  const spine: SpineTerm[] = [];

  for (let yearNumber = 1; yearNumber <= maxYear; yearNumber++) {
    for (const term of TIMELINE_TERMS) {
      spine.push({
        key: `${yearNumber}-${term}`,
        yearNumber,
        term,
        label: `Y${yearNumber}${term}`,
      });
    }
  }

  return spine;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Compute node positions and edges for the lineage layout.
 *
 * - Spine node `i` sits at `x = PADDING_X + i * SPINE_GAP_X`, `y = SPINE_Y`.
 * - Courses of term `i` stack below it at the same x, starting at
 *   `COURSE_START_Y` with `COURSE_GAP_Y` between rows.
 * - Edges: one spine edge per consecutive term pair, one term→course edge
 *   per course.
 */
export function layoutTimeline(entries: Entry[]): TimelineLayout {
  const spine = buildSpineTerms(entries);

  const entriesByTerm = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = `${e.yearNumber}-${e.term}`;
    const existing = entriesByTerm.get(key);
    if (existing) {
      existing.push(e);
    } else {
      entriesByTerm.set(key, [e]);
    }
  }

  const nodes: TimelineLayoutNode[] = [];
  const edges: TimelineLayoutEdge[] = [];
  let maxY = SPINE_Y;

  spine.forEach((st, i) => {
    const termNodeId = `term-${st.key}`;
    const x = PADDING_X + i * SPINE_GAP_X;

    nodes.push({
      id: termNodeId,
      kind: "term",
      position: { x, y: SPINE_Y },
      label: st.label,
    });

    if (i > 0) {
      const prev = spine[i - 1]!;
      edges.push({
        id: `spine-${prev.key}-to-${st.key}`,
        source: `term-${prev.key}`,
        target: termNodeId,
        kind: "spine",
      });
    }

    const col = entriesByTerm.get(st.key) ?? [];
    col.forEach((entry, rowIndex) => {
      const courseNodeId = `course-${entry.courseId}-${st.key}`;
      const y = COURSE_START_Y + rowIndex * COURSE_GAP_Y;

      nodes.push({
        id: courseNodeId,
        kind: "course",
        position: { x, y },
        entry,
      });

      edges.push({
        id: `edge-${termNodeId}-to-${courseNodeId}`,
        source: termNodeId,
        target: courseNodeId,
        kind: "term-course",
      });

      maxY = Math.max(maxY, y);
    });
  });

  return { nodes, edges, maxY };
}
