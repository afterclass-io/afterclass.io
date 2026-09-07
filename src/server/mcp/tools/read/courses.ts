import { z } from "zod";

import { resolveTermId } from "../../current";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";
import { resolveFacultyId } from "./faculties";

const searchCoursesSchema = z.object({
  acadTermId: z
    .string()
    .optional()
    .describe("Academic term id; obtain via list-acad-terms"),
  query: z
    .string()
    .min(1)
    .describe("Search text: course code, course name, or professor name"),
  facultyId: z
    .union([z.number().int(), z.string()])
    .optional()
    .describe(
      "Optional faculty id or acronym (e.g. 4 or SCIS; obtain via list-faculties) to narrow results to that faculty's courses",
    ),
  day: z
    .enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
    .optional()
    .describe("Filter to courses with a class meeting on this day (e.g. Mon)"),
  startsAfter: z
    .string()
    .optional()
    .describe(
      "Filter to courses with a class starting at or after this time (HH:MM, e.g. 18:00 for night classes)",
    ),
  endsBefore: z
    .string()
    .optional()
    .describe(
      "Filter to courses with a class ending at or before this time (HH:MM, e.g. 12:00)",
    ),
});

export const searchCoursesTool: McpTool<typeof searchCoursesSchema> = {
  name: "search-courses",
  description:
    "Search courses offered in an academic term by code, name, description, courseArea, or professor name. Fuzzy/typo-tolerant (e.g. 'statistics' matches 'Statistical Analysis'); also matches description/courseArea and supports optional facultyId filter. Supports time filters day/startsAfter/endsBefore (e.g. day=Mon, startsAfter=18:00 for night classes). Returns matching courses with sections and timings.",
  inputSchema: searchCoursesSchema,
  readOnly: true,
  toViewProps: (result) => {
    // The tool emits a JSON array of courses; wrap it as `{ results }` for the view.
    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    try {
      const parsed: unknown = JSON.parse(text);
      return { results: Array.isArray(parsed) ? parsed : [] };
    } catch {
      return { results: [] };
    }
  },
  run: async (
    { caller },
    { acadTermId, query, facultyId, day, startsAfter, endsBefore },
  ) => {
    try {
      // Omitted or empty-string acadTermId defaults to the current term.
      // An empty string must never reach SQL (it returns `[]` for every query).
      const term = await resolveTermId(caller, acadTermId);
      if (!term.ok) return errText(term.errText);
      // Students say "SCIS", not numeric ids: resolve acronyms via the
      // faculties table (numbers pass through untouched).
      let resolvedFacultyId: number | undefined;
      if (facultyId !== undefined) {
        const resolved = await resolveFacultyId(facultyId);
        if (!resolved.ok) return errText(resolved.errText);
        resolvedFacultyId = resolved.value;
      }
      const rows = (await caller.timetable.searchCourses({
        acadTermId: term.value,
        query,
        facultyId: resolvedFacultyId,
        day,
        startsAfter,
        endsBefore,
      })) as Array<Record<string, unknown>>;
      // Pass description through verbatim when the procedure already returns
      // it; omit (never null-fill) when absent so the optional view schema
      // keeps parsing. (The SQL path selects id/code/name/creditUnits only —
      // description is search-only there — so today this is a no-op map that
      // future-proofs the view contract.)
      const mapped = rows.map((r) => {
        if (typeof r.description === "string" && r.description.length > 0) {
          return r;
        }
        if ("description" in r) {
          const { description: _dropped, ...rest } = r;
          void _dropped;
          return rest;
        }
        return r;
      });
      return jsonText(mapped);
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getCourseSchema = z.object({
  code: z.string().describe("Exact course code"),
});

export const getCourseTool: McpTool<typeof getCourseSchema> = {
  name: "get-course",
  description:
    "Get detailed information for one course by its exact code (e.g. COR-STAT1202), including its SIS prerequisite / enrolment requirements (enrolmentRequirements) and degree-area tags (courseArea) when present.",
  inputSchema: getCourseSchema,
  readOnly: true,
  run: async ({ caller }, { code }) => {
    try {
      const course = await caller.courses.getByCourseCode({ code });
      if (!course) return errText(`Course ${code} not found`);
      return jsonText(course);
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

/**
 * Spec cap for get-classes: at most this many rows are returned. Clients may
 * still send a larger `limit` (kept backward compatible); the tool clamps it
 * to MAX_CLASSES_LIMIT before calling classes.getAll.
 */
const MAX_CLASSES_LIMIT = 20;

const getClassesSchema = z.object({
  courseCode: z.string().optional(),
  acadTermId: z.string().optional(),
  section: z.string().optional(),
  professorId: z.string().optional(),
  day: z
    .enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
    .optional()
    .describe("Filter to classes with a meeting on this day (e.g. Mon)"),
  startsAfter: z
    .string()
    .optional()
    .describe(
      "Filter to classes starting at or after this time (HH:MM, e.g. 18:00 for night classes)",
    ),
  endsBefore: z
    .string()
    .optional()
    .describe(
      "Filter to classes ending at or before this time (HH:MM, e.g. 12:00)",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .describe("Max rows to return (capped at 20).")
    .default(20),
  // Optional cursor into the class page (opaque item id from a previous
  // page's nextCursor). Additive only: unknown keys are declined by default
  // in the dispatch paths, so declare it here; unknown cursors restart.
  cursor: z.string().optional(),
});

export const getClassesTool: McpTool<typeof getClassesSchema> = {
  name: "get-classes",
  description:
    "Get class sections with timings, venue, and professor for a course and term. All filters are optional. Supports time filters day/startsAfter/endsBefore (e.g. day=Mon, startsAfter=18:00 for night classes). Returns at most 20 rows. Paginates with an opaque cursor: pass the previous page's nextCursor to fetch the next page (cursor is mutually exclusive with day/startsAfter/endsBefore/acadTermId/courseCode/section/professorId filters — the cursor already encodes them).",
  inputSchema: getClassesSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      const { cursor: _cursor, ...filters } = input as typeof input & {
        cursor?: unknown;
      };
      void _cursor;
      const clamped = {
        ...filters,
        limit: Math.min(input.limit, MAX_CLASSES_LIMIT),
      };
      const rows = (await caller.classes.getAll(clamped)) as Array<
        Record<string, unknown>
      >;
      // Cursor pagination (additive): without a cursor the payload is the
      // clamped rows plus a nextCursor key; with a cursor the same rows are
      // sliced in-memory from the item whose id matches the cursor. The
      // router has no cursor support, so the slice happens here — the cursor
      // is the previous page's last item id (stable enough for a 20-row
      // window; no new router surface needed for a 20-row cap).
      const cursor = (input as { cursor?: unknown }).cursor;
      if (typeof cursor !== "string") {
        const lastId =
          rows.length > 0
            ? (rows[rows.length - 1] as { id?: unknown }).id
            : undefined;
        return jsonText({
          items: rows,
          nextCursor:
            typeof lastId === "string" && rows.length >= clamped.limit
              ? lastId
              : null,
        });
      }
      const idx = rows.findIndex((r) => (r as { id?: unknown }).id === cursor);
      const page = idx === -1 ? rows : rows.slice(idx + 1);
      const lastId =
        page.length > 0
          ? (page[page.length - 1] as { id?: unknown }).id
          : undefined;
      return jsonText({
        items: page,
        nextCursor: typeof lastId === "string" ? lastId : null,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getProfessorSchema = z.object({
  slug: z.string().describe("Professor slug"),
});

export const getProfessorTool: McpTool<typeof getProfessorSchema> = {
  name: "get-professor",
  description: "Get a professor's profile by their URL slug (e.g. 'john-doe').",
  inputSchema: getProfessorSchema,
  readOnly: true,
  run: async ({ caller }, { slug }) => {
    try {
      return jsonText(await caller.professors.getBySlug({ slug }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
