import type React from "react";
import { TOKENS, Skeleton, viewShellStyle } from "./tokens";

/**
 * Host-agnostic pending/error wrapper for MCP App Views (Task 5).
 *
 * View-sandbox rules: imports = react + relative views/shared/* only; no
 * `@/*`, no `next/*`, no Tailwind `className` (inline styles + TOKENS).
 * Stays host-agnostic per 2026-09-06-assistant-deep-links.md: no chat-card
 * rendering, no deep-link logic — the ready body stays in the calling view.
 *
 * Props are status-shaped: `pending` renders the shared Skeleton,
 * `error` renders the card-chrome alert with the message, `ready` renders
 * `children`. `dark` selects the TOKENS theme. `skeleton` overrides the
 * pending placeholder when a view needs its own.
 *
 * NOTE (naming): `tokens.tsx` also exports a presentational `ViewShell`
 * (`{ dark, role, children }` card chrome). This component is the stateful
 * status wrapper; prefer importing this one in views (`../shared/view-shell`)
 * and treat the tokens one as legacy chrome for non-status layouts. A future
 * task may consolidate the two (reusing `viewShellStyle` here is the first
 * step — both shells now share the same chrome object).
 */
export type ViewShellStatus = "pending" | "ready" | "error";

export const ViewShell: React.FC<{
  status: ViewShellStatus;
  dark: boolean;
  error?: { message: string } | null;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}> = ({ status, dark, error, skeleton, children }) => {
  const c = dark ? TOKENS.dark : TOKENS.light;
  if (status === "pending") {
    return <>{skeleton ?? <Skeleton dark={dark} />}</>;
  }
  if (status === "error") {
    return (
      <div role="alert" style={viewShellStyle(c)}>
        {error?.message ?? "Something went wrong."}
      </div>
    );
  }
  return <>{children}</>;
};
