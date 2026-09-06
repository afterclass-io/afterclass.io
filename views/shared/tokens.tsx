/** Shared design tokens + Skeleton for MCP Apps widgets. Dependency-free: no `@/` imports. */

export type ThemeColors = (typeof TOKENS)[keyof typeof TOKENS];

export const TOKENS = {
  light: {
    card: "oklch(0.99 0 0)",
    cardFg: "oklch(0.141 0.005 285.823)",
    mutedFg: "oklch(0.552 0.016 285.938)",
    muted: "oklch(0.967 0.001 286.375)",
    border: "oklch(0.92 0.004 286.32)",
    primary: "oklch(0.48 0.2229 280.55)",
    primaryFg: "oklch(0.969 0.016 293.756)",
    radius: "0.75rem",
  },
  dark: {
    card: "oklch(0.21 0.006 285.885)",
    cardFg: "oklch(0.985 0 0)",
    mutedFg: "oklch(0.705 0.015 286.067)",
    muted: "oklch(0.274 0.006 286.033)",
    border: "oklch(1 0 0 / 10%)",
    primary: "oklch(0.585 0.233 277.117)",
    primaryFg: "oklch(0.969 0.016 293.756)",
    radius: "0.75rem",
  },
} as const;

/** Shared @keyframes pulse injector for view shells (each view keeps its own
 * `<style>` usage; this just centralizes the keyframe text). */
export const PulseStyle: React.FC = () => (
  <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
);

/** Shared card-shell styling for pending/error states: same card chrome the
 * views already render inline. Provided for new views; existing views keep
 * their own inline shells (not migrated in this pass). */
export const viewShellStyle = (c: ThemeColors): React.CSSProperties => ({
  fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
  color: c.cardFg,
  background: c.card,
  border: `1px solid ${c.border}`,
  borderRadius: c.radius,
  padding: 16,
});

export const ViewShell: React.FC<{
  dark: boolean;
  role?: "alert" | "status";
  children: React.ReactNode;
}> = ({ dark, role, children }) => {
  const c = dark ? TOKENS.dark : TOKENS.light;
  return (
    <div role={role} style={viewShellStyle(c)}>
      {children}
    </div>
  );
};

export const Skeleton: React.FC<{ dark: boolean }> = ({ dark }) => {
  const c = dark ? TOKENS.dark : TOKENS.light;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 56,
            borderRadius: c.radius,
            background: dark
              ? "oklch(0.274 0.006 286.033)"
              : "oklch(0.967 0.001 286.375)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
        }}
      >
        Loading...
      </span>
    </div>
  );
};
