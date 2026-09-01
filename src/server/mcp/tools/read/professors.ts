import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const searchProfessorsSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Search text: professor name, boss alias, or slug"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Max rows to return (default 10)")
    .default(10),
});

export const searchProfessorsTool: McpTool<typeof searchProfessorsSchema> = {
  name: "search-professors",
  description:
    "Search professors by name, boss alias, or slug. Fuzzy/typo-tolerant (best-word trigram match on name). Returns matching professors as { id, slug, name } plus a total count.",
  inputSchema: searchProfessorsSchema,
  readOnly: true,
  run: async ({ caller }, { query, limit }) => {
    try {
      const result = await caller.professors.search({ query, limit });
      // No matches -> empty array, not an error.
      if (result.rows.length === 0) return jsonText([]);
      return jsonText({ rows: result.rows, count: result.count });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
