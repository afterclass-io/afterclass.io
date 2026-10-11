/**
 * Deterministic course-code → color mapping for timetable display.
 *
 * Uses djb2 hash modulo 12 to pick from a fixed palette of theme-aware
 * shadcn token classes (see `src/common/styles/shadcn.css`). Same course
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
  /**
   * Ring color in the card's own hue, applied with `ring-2` while the slot
   * is the current time slot.
   */
  nowClassName: string;
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

const PALETTE: readonly CourseColor[] = [
  {
    className: "bg-primary/10 text-foreground border-primary/30",
    nowClassName: "ring-primary",
  },
  {
    className: "bg-info/10 text-foreground border-info/30",
    nowClassName: "ring-info",
  },
  {
    className: "bg-success/10 text-foreground border-success/30",
    nowClassName: "ring-success",
  },
  {
    className: "bg-warning/10 text-foreground border-warning/30",
    nowClassName: "ring-warning",
  },
  {
    className: "bg-error/10 text-foreground border-error/30",
    nowClassName: "ring-error",
  },
  {
    className: "bg-chart-1/10 text-foreground border-chart-1/30",
    nowClassName: "ring-chart-1",
  },
  {
    className: "bg-chart-2/10 text-foreground border-chart-2/30",
    nowClassName: "ring-chart-2",
  },
  {
    className: "bg-chart-3/10 text-foreground border-chart-3/30",
    nowClassName: "ring-chart-3",
  },
  {
    className: "bg-chart-4/10 text-foreground border-chart-4/30",
    nowClassName: "ring-chart-4",
  },
  {
    className: "bg-chart-5/10 text-foreground border-chart-5/30",
    nowClassName: "ring-chart-5",
  },
  {
    className: "bg-secondary text-secondary-foreground border-border",
    nowClassName: "ring-foreground/60",
  },
  {
    className: "bg-accent text-accent-foreground border-border",
    nowClassName: "ring-foreground/60",
  },
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
  return PALETTE[idx]!;
}
