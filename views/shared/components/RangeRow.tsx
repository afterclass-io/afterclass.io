import type React from "react";
import type { ThemeColors } from "../tokens";

/**
 * One labelled track with a min–median range band and a median tick.
 * Extracted verbatim from `views/bid-explorer/view.tsx`. Host-agnostic:
 * all data + theme via props.
 */
export const RangeRow: React.FC<{
  label: string;
  min: number;
  median: number;
  max: number;
  dashed?: boolean;
  c: ThemeColors;
}> = ({ label, min, median, max, dashed, c }) => {
  const pct = (v: number) => Math.min(100, (v / max) * 100);
  const left = pct(min);
  const width = Math.max(1, pct(median) - left);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 110,
          flexShrink: 0,
          fontSize: 12,
          color: c.mutedFg,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 18,
          position: "relative",
          background: c.border,
          borderRadius: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${left}%`,
            width: `${width}%`,
            top: 0,
            bottom: 0,
            borderRadius: 4,
            background: dashed ? "transparent" : `${c.primary}4D`, // 30% opacity
            border: dashed ? `2px dashed ${c.primary}` : "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${pct(median)}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: c.primary,
          }}
        />
      </div>
      <span
        style={{
          flexShrink: 0,
          fontFamily: "var(--font-geist-mono, ui-monospace)",
          fontSize: 12,
          textAlign: "right",
        }}
      >
        ${min}–${median}
      </span>
    </div>
  );
};
