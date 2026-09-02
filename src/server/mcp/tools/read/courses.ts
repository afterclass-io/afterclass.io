import { z } from "zod";

import { resolveTermId } from "../../current";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const searchCoursesSchema = z.object({
  acadTermId: z
    .string()
    .optional()
    .describe("Academic term id; obtain via list-acad-terms"),
  query: z.string().min(1).describe("Search text: course code, course name, or professor name"),
  facultyId: z.number().int().optional().describe("Optional faculty id to narrow results to that faculty's courses"),
});

export const searchCoursesTool: McpTool<typeof searchCoursesSchema> = {
  name: "search-courses",
  description:
    "Search courses offered in an academic term by code, name, description, courseArea, or professor name. Fuzzy/typo-tolerant (e.g. 'statistics' matches 'Statistical Analysis'); also matches description/courseArea and supports optional facultyId filter. Returns matching courses with sections and timings.",
  inputSchema: searchCoursesSchema,
  readOnly: true,
  widgetName: "course-search",
  toWidgetProps: (result) => {
    // The tool emits a JSON array of courses; wrap it as `{ results }` for the widget.
    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    try {
      const parsed: unknown = JSON.parse(text);
      return { results: Array.isArray(parsed) ? parsed : [] };
    } catch {
      return { results: [] };
    }
  },
  run: async ({ caller }, { acadTermId, query, facultyId }) => {
    try {
      // Omitted or empty-string acadTermId defaults to the current term.
      // An empty string must never reach SQL (it returns `[]` for every query).
      const term = await resolveTermId(caller, acadTermId);
      if (!term.ok) return errText(term.errText);
      return jsonText(
        await caller.timetable.searchCourses({ acadTermId: term.value, query, facultyId }),
      );
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getCourseSchema = z.object({ code: z.string().describe("Exact course code") });

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
    .describe("Filter to classes starting at or after this time (HH:MM, e.g. 18:00 for night classes)"),
  endsBefore: z
    .string()
    .optional()
    .describe("Filter to classes ending at or before this time (HH:MM, e.g. 12:00)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .describe("Max rows to return (capped at 20).")
    .default(100),
});

export const getClassesTool: McpTool<typeof getClassesSchema> = {
  name: "get-classes",
  description:
    "Get class sections with timings, venue, and professor for a course and term. All filters are optional. Supports time filters day/startsAfter/endsBefore (e.g. day=Mon, startsAfter=18:00 for night classes). Returns at most 20 rows.",
  inputSchema: getClassesSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      const clamped = { ...input, limit: Math.min(input.limit, MAX_CLASSES_LIMIT) };
      return jsonText(await caller.classes.getAll(clamped));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getProfessorSchema = z.object({ slug: z.string().describe("Professor slug") });

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
