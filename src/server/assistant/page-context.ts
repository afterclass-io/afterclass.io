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

/** Ephemeral per-turn instructions suffix. SYSTEM_PROMPT itself is untouched. */
export function buildPageContextSuffix(
  ctx: PageContext | ValidatedPageContext,
): string {
  return (
    `\n<page_context>\nUser is viewing ${ctx.pathname}` +
    (ctx.course ? ` — course ${ctx.course}` : "") +
    (ctx.section ? ` section ${ctx.section}` : "") +
    (ctx.classId ? ` (classId ${ctx.classId})` : "") +
    (ctx.profSlug ? ` — professor ${ctx.profSlug}` : "") +
    `\nResolve "this course / this prof / this section" against this view when the user does not name one. Explicit user mentions always win over this context. State your assumption ("Based on IS215 G1 you're viewing…"). Earlier <page_context> blocks in history are stale — only the latest applies.\n</page_context>`
  );
}
