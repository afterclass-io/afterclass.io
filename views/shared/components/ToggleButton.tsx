import type React from "react";
import type { ThemeColors } from "../tokens";

/**
 * Plain-button toggle (extracted verbatim from `views/bid-explorer/view.tsx`,
 * mirror of the website `TagToggleGroup` tag behavior). Host-agnostic:
 * theme + state arrive via props, no hooks inside.
 */
export const ToggleButton: React.FC<{
  label: string;
  pressed: boolean;
  onClick: () => void;
  c: ThemeColors;
}> = ({ label, pressed, onClick, c }) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    style={{
      fontSize: 12,
      fontWeight: pressed ? 600 : 400,
      padding: "2px 10px",
      borderRadius: 9999,
      cursor: "pointer",
      border: `1px solid ${pressed ? c.primary : c.border}`,
      background: pressed ? `${c.primary}1A` : "transparent",
      color: pressed ? c.primary : c.cardFg,
    }}
  >
    {label}
  </button>
);
