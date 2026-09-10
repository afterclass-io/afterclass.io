import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import { useToolContext, useViewTheme } from "mcp-use/react";
import type { TimetableViewData } from "../../src/mcp/view-tools/schemas";
import { TOKENS, Skeleton } from "../shared/tokens";
import { DAY_ORDER, normalizeDay } from "../shared/day";
import { formatExamDate } from "../shared/format";

/**
 * MCP App View (mcp-use v2) for the `get-my-timetable-detail` tool. Must stay
 * dependency-free: no `@/server/*`, no `next/*`, no `@/*` aliases.
 *
 * The layout semantics are copied from the website's read-only sharing UI —
 * `SharedTimetableView` rendering `TimetableGrid` with `view="classes"` and
 * `readOnly` (src/app/(school)/share/timetable/[token]/SharedTimetableView.tsx):
 * day columns (Mon–Fri, mirroring the share grid) ×
 * time rows, with overlapping same-day blocks stacked side-by-side per the
 * `layoutDay` lane-packing semantics
 * (src/modules/timetable/functions/slot-math.ts). Only the data channel
 * changed:
 *
 *   v1 useWidget().props            -> v2 useToolContext().toolOutput
 *   v1 useWidget().isPending        -> v2 status === "pending"
 *   v1 useWidget().theme            -> v2 useViewTheme()
 *   v1 widgetMetadata export        -> v2 viewConfig export
 *
 * Read-only: no slot clicks, no remove affordances, no bid chips, no CTAs.
 * Course colors are a local hash → fixed token-friendly palette (the website
 * uses Tailwind `courseColor` classes, which cannot ship in this bundle).
 */

export const viewConfig = {
  autoResize: true,
  displayModes: ["inline", "fullscreen", "pip"],
} satisfies ViewConfig;

type FlatSlot = {
  classId: string;
  courseCode: string;
  courseName: string;
  section: string;
  day: string | null;
  startTime: string;
  endTime: string;
  venue: string | null;
  professor: string | null;
  creditUnits: number;
};

/** Earliest visible time (08:00) / latest (22:15), mirroring slot-math GRID_START/END_MIN. */
const GRID_START_MIN = 8 * 60;
const GRID_END_MIN = 22 * 60 + 15;
const GRID_RANGE_MIN = GRID_END_MIN - GRID_START_MIN;

// ---------------------------------------------------------------------------
// Dependency-free copies of the shared timetable helpers
// ---------------------------------------------------------------------------
// These mirror (not import) src/common/functions/time.ts parseTimePartsSafe
// and the lane-packing core of src/modules/timetable/functions/slot-math.ts
// layoutDay — the View bundle cannot resolve `@/*` aliases or app code.
// Day normalization lives in `../shared/day` (unknown→null contract);
// exam-date slicing lives in `../shared/format`.

function parseTimePartsSafe(t: string): [number, number] | null {
  const parts = t.split(":").map(Number);
  const h = parts[0] ?? NaN;
  const m = parts[1] ?? NaN;
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return [h, m];
}

function timeToMinutes(t: string): number | null {
  const parsed = parseTimePartsSafe(t);
  if (!parsed) return null;
  return parsed[0] * 60 + parsed[1];
}

/** Longest-name-first SMU venue abbreviations (mirrors abbreviate-venue.ts). */
function abbreviateVenue(venue: string): string {
  return venue
    .replace(/Active Learning Classroom/g, "ALC")
    .replace(/Mochtar Riady Auditorium/g, "MRA")
    .replace(/Ngee Ann Kongsi Auditorium/g, "NAKA")
    .replace(/Seminar Room/g, "SR")
    .replace(/Classroom/g, "CR");
}

/**
 * Deterministic course-code → palette index (mirrors the djb2 hash in
 * course-color.ts; colors are inline styles here instead of Tailwind classes).
 */
function courseColorIndex(courseCode: string, paletteSize: number): number {
  let hash = 5381;
  for (let i = 0; i < courseCode.length; i++) {
    hash = ((hash << 5) + hash + courseCode.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) % paletteSize;
}

type PositionedBlock = {
  slot: FlatSlot;
  topPct: number;
  heightPct: number;
  colIndex: number;
  colCount: number;
};

/**
 * Pack one day's slots into positioned blocks — same semantics as `layoutDay`:
 * filter slots entirely outside the grid, sort by start, partition into
 * connected overlap components, assign each slot to the first non-overlapping
 * lane (new lane when needed); every slot in a component shares the lane
 * count. Slots with an unparseable day or time are dropped (never rendered).
 */
function layoutDay(slots: FlatSlot[]): PositionedBlock[] {
  const parsed = slots
    .map((slot) => ({
      slot,
      startMin: timeToMinutes(slot.startTime),
      endMin: timeToMinutes(slot.endTime),
    }))
    .filter(
      (s): s is { slot: FlatSlot; startMin: number; endMin: number } =>
        s.startMin !== null &&
        s.endMin !== null &&
        s.endMin > GRID_START_MIN &&
        s.startMin < GRID_END_MIN,
    );
  if (parsed.length === 0) return [];
  const sorted = [...parsed].sort((a, b) => a.startMin - b.startMin);

  const clamp = (m: number) =>
    Math.max(GRID_START_MIN, Math.min(GRID_END_MIN, m));
  const toPct = (m: number) =>
    ((clamp(m) - GRID_START_MIN) / GRID_RANGE_MIN) * 100;

  // Partition into connected overlap components (sorted by start).
  const components: (typeof sorted)[] = [];
  let current: typeof sorted = [];
  let componentEndMax = 0;
  for (const s of sorted) {
    if (s.startMin >= componentEndMax) {
      if (current.length > 0) components.push(current);
      current = [];
      componentEndMax = 0;
    }
    current.push(s);
    componentEndMax = Math.max(componentEndMax, s.endMin);
  }
  if (current.length > 0) components.push(current);

  const out: PositionedBlock[] = [];
  for (const comp of components) {
    const laneEnds: number[] = [];
    const laneOf: number[] = [];
    for (const s of comp) {
      const start = clamp(s.startMin);
      const end = clamp(s.endMin);
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      laneOf.push(lane);
    }
    const colCount = laneEnds.length;
    comp.forEach((s, i) => {
      out.push({
        slot: s.slot,
        topPct: toPct(s.startMin),
        heightPct:
          ((clamp(s.endMin) - clamp(s.startMin)) / GRID_RANGE_MIN) * 100,
        colIndex: laneOf[i]!,
        colCount,
      });
    });
  }
  return out;
}

// Block background tints (light, dark) — one per course-color lane.
const BLOCK_PALETTE: ReadonlyArray<{ light: string; dark: string }> = [
  { light: "oklch(0.9 0.05 280)", dark: "oklch(0.35 0.08 280)" },
  { light: "oklch(0.9 0.05 240)", dark: "oklch(0.35 0.08 240)" },
  { light: "oklch(0.9 0.05 160)", dark: "oklch(0.35 0.08 160)" },
  { light: "oklch(0.92 0.06 90)", dark: "oklch(0.36 0.08 90)" },
  { light: "oklch(0.9 0.06 20)", dark: "oklch(0.36 0.08 20)" },
  { light: "oklch(0.9 0.04 320)", dark: "oklch(0.35 0.07 320)" },
];

function formatHourLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const TimetableView: React.FC = () => {
  const { status, toolOutput, error } =
    useToolContext<"get-my-timetable-detail">();
  const theme = useViewTheme();
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;

  if (status === "pending") return <Skeleton dark={dark} />;
  if (status === "error") {
    return (
      <div
        role="alert"
        style={{
          fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
          color: c.cardFg,
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: c.radius,
          padding: 16,
        }}
      >
        {error.message}
      </div>
    );
  }
  // `toolOutput` is the normalized timetable detail from the tool's
  // outputSchema. Read defensively exactly like the sibling Views read theirs.
  const props = toolOutput as TimetableViewData | undefined;
  const name = props?.name ?? "";
  const slots: FlatSlot[] = Array.isArray(props?.slots) ? props.slots : [];
  const examTimings: TimetableViewData["examTimings"] = Array.isArray(
    props?.examTimings,
  )
    ? props.examTimings
    : [];

  const byDay = new Map<string, FlatSlot[]>();
  for (const slot of slots) {
    const day = normalizeDay(slot.day);
    if (!day) continue;
    const list = byDay.get(day) ?? [];
    list.push(slot);
    byDay.set(day, list);
  }

  // Hour ticks span the full visible grid (08:00–22:15) so axis labels cover
  // the whole column height — scoped ticks would leave empty space below.
  const hourTicks: number[] = [];
  for (let h = GRID_START_MIN; h <= GRID_END_MIN; h += 60) hourTicks.push(h);

  const empty = slots.length === 0;

  return (
    <div
      style={{
        fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
        color: c.cardFg,
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: c.radius,
        padding: 16,
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      {/* Header: timetable name (mirrors SharedTimetableView's title row) */}
      {name && <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>}
      {empty ? (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: c.mutedFg }}>
          No classes in this timetable yet.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            marginTop: name ? 12 : 0,
            border: `1px solid ${c.border}`,
            borderRadius: c.radius,
            overflowX: "auto",
          }}
        >
          {/* Time axis */}
          <div
            style={{
              width: 44,
              flexShrink: 0,
              borderRight: `1px solid ${c.border}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: c.mutedFg,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "6px 4px",
                borderBottom: `1px solid ${c.border}`,
                visibility: "hidden",
              }}
              aria-hidden
            >
              —
            </div>
            <div style={{ position: "relative", height: 480 }}>
              {hourTicks.map((h, i) => {
                const topPct = ((h - GRID_START_MIN) / GRID_RANGE_MIN) * 100;
                return (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      top: `${topPct}%`,
                      left: 2,
                      right: 2,
                      fontSize: 9,
                      color: c.mutedFg,
                      // Pin the final tick inside the column: its text would
                      // otherwise overflow the 480px body and — because
                      // overflow-x:auto computes overflow-y to auto — force a
                      // vertical scrollbar on the whole grid.
                      transform:
                        i === hourTicks.length - 1
                          ? "translateY(-100%)"
                          : undefined,
                    }}
                  >
                    {formatHourLabel(h)}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Day columns */}
          {DAY_ORDER.slice(0, 5).map((day) => {
            const blocks = layoutDay(byDay.get(day) ?? []);
            return (
              <div
                key={day}
                style={{
                  flex: "1 1 0",
                  minWidth: 88,
                  borderRight: day === "Fri" ? "none" : `1px solid ${c.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: c.mutedFg,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "center",
                    padding: "6px 4px",
                    borderBottom: `1px solid ${c.border}`,
                  }}
                >
                  {day}
                </div>
                <div style={{ position: "relative", height: 480 }}>
                  {blocks.map((b) => {
                    const palette =
                      BLOCK_PALETTE[
                        courseColorIndex(
                          b.slot.courseCode,
                          BLOCK_PALETTE.length,
                        )
                      ]!;
                    const gapPct = b.colCount > 1 ? 0.5 : 0;
                    const leftPct =
                      b.colCount > 1
                        ? (b.colIndex / b.colCount) * 100 + gapPct
                        : 0;
                    const widthPct =
                      b.colCount > 1
                        ? (1 / b.colCount) * 100 - gapPct * 2
                        : 100;
                    return (
                      <div
                        key={`${b.slot.classId}-${b.slot.day}-${b.slot.startTime}`}
                        data-test="timetable-class-card"
                        data-day={normalizeDay(b.slot.day)}
                        data-overlap-count={b.colCount}
                        data-width-pct={widthPct.toFixed(1)}
                        title={`${b.slot.courseCode} ${b.slot.section} · ${b.slot.courseName}`}
                        style={{
                          position: "absolute",
                          top: `${b.topPct}%`,
                          height: `${b.heightPct}%`,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          overflow: "hidden",
                          borderRadius: 6,
                          border: `1px solid ${c.border}`,
                          background: dark ? palette.dark : palette.light,
                          padding: "2px 6px",
                          fontSize: 11,
                          lineHeight: 1.35,
                          boxSizing: "border-box",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {b.slot.courseCode}{" "}
                          <span style={{ fontWeight: 400 }}>
                            {b.slot.section}
                          </span>
                        </span>
                        {b.slot.venue && (
                          <span
                            style={{
                              display: "block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              opacity: 0.8,
                            }}
                          >
                            {abbreviateVenue(b.slot.venue)}
                          </span>
                        )}
                        {b.slot.professor && (
                          <span
                            style={{
                              display: "block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              opacity: 0.8,
                            }}
                          >
                            {b.slot.professor}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {examTimings.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: c.mutedFg,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Exams
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {examTimings.map((e) => {
              const date = formatExamDate(e.date);
              const day = normalizeDay(e.dayOfWeek);
              const time = `${e.startTime}–${e.endTime}`;
              const venue = e.venue ? ` @ ${e.venue}` : "";
              return (
                <div
                  key={`${e.classId}-${e.date ?? ""}-${e.startTime}`}
                  data-test="timetable-exam-row"
                  style={{ fontSize: 12, color: c.mutedFg }}
                >
                  <span style={{ fontWeight: 600, color: c.cardFg }}>
                    {e.courseCode} {e.section}
                  </span>
                  {` · ${date}${day ? ` (${day})` : ""} ${time}${venue}`}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableView;
