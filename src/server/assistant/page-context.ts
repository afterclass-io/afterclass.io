import { z } from "zod";
import type { PageContext } from "@/modules/assistant/use-page-context";

// Server-side mirror of the client PageContext shape. Validates untrusted
// client input: allowlisted keys only (.strict()), length caps. Invalid
// context is ignored safely — never 400 a chat turn for it.
export const pageContextSchema = z
  .object({
    pathname: z.string().min(1).max(200),
    course: z.string().min(1).max(120).optional(),
    section: z.string().min(1).max(120).optional(),
    classId: z.string().min(1).max(120).optional(),
    profSlug: z.string().min(1).max(120).optional(),
  })
  .strict();

export type ValidatedPageContext = z.infer<typeof pageContextSchema>;

/**
 * Escape one untrusted pageContext field value before it is interpolated
 * into the `<page_context>` instructions suffix (Task 7). Newlines and
 * carriage returns become spaces (a value can never break out of its line),
 * and `<`/`>`/`&` become entities (a value can never close or forge the
 * `<page_context>` tags). The escaping slots into the sibling injection
 * point only: no message-text mixing, no write auto-authorization, no
 * confirm-gate contact.
 */
export function escapePageContextValue(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Ephemeral per-turn instructions suffix. SYSTEM_PROMPT itself is untouched. */
export function buildPageContextSuffix(
  ctx: PageContext | ValidatedPageContext,
): string {
  const pathname = escapePageContextValue(ctx.pathname);
  const course = ctx.course ? escapePageContextValue(ctx.course) : "";
  const section = ctx.section ? escapePageContextValue(ctx.section) : "";
  const classId = ctx.classId ? escapePageContextValue(ctx.classId) : "";
  const profSlug = ctx.profSlug ? escapePageContextValue(ctx.profSlug) : "";
  return (
    `\n<page_context>\nUser is viewing ${pathname}` +
    (course ? ` — course ${course}` : "") +
    (section ? ` section ${section}` : "") +
    (classId ? ` (classId ${classId})` : "") +
    (profSlug ? ` — professor ${profSlug}` : "") +
    `\nResolve "this course / this prof / this section" against this view when the user does not name one. Explicit user mentions always win over this context. State your assumption ("Based on IS215 G1 you're viewing…"). Earlier <page_context> blocks in history are stale — only the latest applies.\n</page_context>`
  );
}
