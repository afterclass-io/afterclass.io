import type React from "react";
import type { ThemeColors } from "../tokens";
import { viewShellStyle } from "../tokens";

/**
 * Ready-state card shell shared by the MCP App Views: the `viewShellStyle`
 * chrome at full width, plus the pulse keyframes the skeletons animate with.
 * Host-agnostic; imports only react and views/shared/*.
 */
export const ViewCard: React.FC<{
  c: ThemeColors;
  children: React.ReactNode;
}> = ({ c, children }) => (
  <div
    style={{
      ...viewShellStyle(c),
      boxSizing: "border-box",
      width: "100%",
      maxWidth: "100%",
    }}
  >
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    {children}
  </div>
);
