import { z } from "zod";

import type { ResolveResult } from "../../current";
import {
  errText,
  errorMessage,
  jsonText,
  type McpTool,
  type RouterCaller,
  type RouterOutputs,
} from "../../types";

const listFacultiesSchema = z.object({});

export const listFacultiesTool: McpTool<typeof listFacultiesSchema> = {
  name: "list-faculties",
  description:
    "List all faculties (schools) with id, name, and acronym (e.g. SCIS for the School of Computing and Information Systems). Use this to resolve a faculty name or acronym to its numeric id before calling tools that accept facultyId.",
  inputSchema: listFacultiesSchema,
  readOnly: true,
  run: async ({ caller }) => {
    try {
      return jsonText(await caller.faculties.list());
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

type FacultyRows = RouterOutputs["faculties"]["list"];

/**
 * Resolve a facultyId tool param to its numeric id. Numbers pass through
 * with no procedure call (numeric strings like "4" too); anything else is
 * matched case-insensitively against the faculties list-procedure acronym
 * (SCIS -> 4), so the mapping is resolved from the router and never
 * hardcoded. Mirrors `resolveTermId` in current.ts: `{ ok: true, value }`,
 * or a friendly model-directed error the caller wraps in `errText(...)`.
 */
export async function resolveFacultyId(
  caller: RouterCaller,
  input: number | string,
): Promise<ResolveResult<number>> {
  if (typeof input === "number") return { ok: true, value: input };
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return { ok: true, value: parseInt(trimmed, 10) };
  const rows: FacultyRows = await caller.faculties.list();
  const match = rows.find(
    (r) => r.acronym.toUpperCase() === trimmed.toUpperCase(),
  );
  if (match) return { ok: true, value: match.id };
  return {
    ok: false,
    errText: `Unknown faculty "${input}". Call list-faculties for the valid acronyms (e.g. SCIS, LKCSB, SOSS) and pass the numeric id or acronym.`,
  };
}
