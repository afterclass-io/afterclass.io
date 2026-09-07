import type { ToolAnnotations as SdkToolAnnotations } from "@modelcontextprotocol/server";

import { allTools } from "@/server/mcp/tools";
import { destructiveTools } from "./rate-limit";

/**
 * MCP `tools/list` annotations derived from the catalog at registration.
 *
 * Reuses the SDK's `ToolAnnotations` wire type (all-optional hints + optional
 * `title`) and narrows it: every catalog tool reports all five keys, so
 * clients can rely on their presence. `title` inside `annotations` mirrors
 * the top-level `title` (the SDK documents `title` → `annotations.title` →
 * `name` precedence for display names).
 */
export interface ToolAnnotations extends SdkToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
  idempotentHint: boolean;
}

/**
 * Derive a tool's `tools/list` annotations from the catalog `readOnly` flag
 * plus the `destructiveTools` confirm-gate set (`src/mcp/rate-limit.ts`).
 *
 * - `readOnly:true` → `readOnlyHint:true`, `idempotentHint:true`
 *   (reads change nothing, so repeats are safe).
 * - In the destructive set → `destructiveHint:true`, `idempotentHint:false`
 *   (destructive writes are never idempotent, even when catalogued
 *   read-only — no such tool exists today, but the conjunction keeps the
 *   claim honest if one ever appears).
 * - Other writes (constructive create/upsert) → `destructiveHint:false`,
 *   `idempotentHint:false` (conservative: a retried write re-charges the
 *   budget and may append/overwrite, so clients must not assume repeats
 *   are free).
 * - `openWorldHint:false` for every catalog tool: all 50 operate on local
 *   resources only (Postgres + seed data; URL-building is string
 *   formatting, no external network calls).
 * - `title` humanizes the tool name (`remove-timetable` →
 *   `"Remove Timetable"`) for UI/end-user contexts. Mechanical
 *   split-`-` + capitalize, no acronym exceptions: no catalog name contains
 *   an acronym today (`acad` stays `"Acad"`, matching the canonical
 *   `acadTermId` vocabulary). Revisit if an acronym-bearing name lands.
 *
 * Unknown names (never happen in the registration loop, which iterates
 * `allTools`) fall back to the non-destructive write shape so the gate
 * stays fail-closed on the annotation side too. Created in Task 6;
 * extended in Task 11 (idempotent hardening, SDK type reuse, view-bound
 * adapters routed through this same derivation).
 */
export function getToolAnnotations(name: string): ToolAnnotations {
  const tool = allTools.find((t) => t.name === name);
  const readOnly = tool?.readOnly === true;
  const destructive = destructiveTools.has(name);
  const title = name
    .split("-")
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
  return {
    title,
    readOnlyHint: readOnly,
    destructiveHint: destructive,
    openWorldHint: false,
    idempotentHint: readOnly && !destructive,
  };
}

/**
 * Registration descriptor for one tool: annotations plus the description
 * text with the `confirm:true` requirement surfaced for destructive tools
 * (mirrors the `checkDestructiveConfirm` gate message so `tools/list`
 * readers learn the requirement before calling).
 */
export function getToolRegistration(name: string): {
  title: string;
  description: string;
  annotations: ToolAnnotations;
} {
  const tool = allTools.find((t) => t.name === name);
  const annotations = getToolAnnotations(name);
  const description =
    (tool?.description ?? name) +
    (annotations.destructiveHint
      ? " Requires explicit confirmation: pass confirm:true only after showing the user exactly what will change and getting explicit approval."
      : "");
  return {
    title: annotations.title,
    description,
    annotations,
  };
}
