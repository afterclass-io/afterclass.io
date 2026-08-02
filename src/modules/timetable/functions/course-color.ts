/**
 * Deterministic course-code → color mapping for timetable display.
 *
 * Uses djb2 hash modulo 12 to pick from a fixed palette of theme-aware
 * shadcn token classes (see `src/common/styles/shadcn.scss`). Same course
 * code always produces the same class set, and every entry adapts to both
 * light and dark themes via CSS variables — no hardcoded hex values.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CourseColor = {
  /**
   * Theme-aware Tailwind classes: a tinted background, a readable
   * foreground, and a matching border color. Apply together with `border`.
   *
   * Class names are written out in full (never interpolated) so the
   * Tailwind scanner picks them up.
   */
  className: string;
};

// ---------------------------------------------------------------------------
// djb2 hash (must be kept in sync with tests)
// ---------------------------------------------------------------------------

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned 32-bit
}

// ---------------------------------------------------------------------------
// Palette — 12 token-based class sets, readable in light & dark themes
// ---------------------------------------------------------------------------

const PALETTE: readonly string[] = [
  "bg-primary/10 text-foreground border-primary/30",
  "bg-info/10 text-foreground border-info/30",
  "bg-success/10 text-foreground border-success/30",
  "bg-warning/10 text-foreground border-warning/30",
  "bg-error/10 text-foreground border-error/30",
  "bg-chart-1/10 text-foreground border-chart-1/30",
  "bg-chart-2/10 text-foreground border-chart-2/30",
  "bg-chart-3/10 text-foreground border-chart-3/30",
  "bg-chart-4/10 text-foreground border-chart-4/30",
  "bg-chart-5/10 text-foreground border-chart-5/30",
  "bg-secondary text-secondary-foreground border-border",
  "bg-accent text-accent-foreground border-border",
];

// ---------------------------------------------------------------------------
// courseColor
// ---------------------------------------------------------------------------

/**
 * Returns a deterministic theme-aware class set for a given course code.
 *
 * The same `courseCode` always maps to the same slot. All 12 slots are
 * reachable, and every entry uses shadcn theme tokens so it stays readable
 * in both light and dark mode.
 */
export function courseColor(courseCode: string): CourseColor {
  const idx = djb2(courseCode) % PALETTE.length;
  return { className: PALETTE[idx]! };
}
