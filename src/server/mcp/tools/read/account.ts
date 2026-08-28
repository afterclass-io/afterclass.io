import { z } from "zod";

import { db } from "@/server/db";
import { getQuotaState } from "@/server/assistant/quota";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const getMeSchema = z.object({});

/**
 * get-me: the signed-in student's own account profile.
 * The user row is already loaded as the MCP session user (`ctx.user`), so no
 * public tRPC route is needed; only the faculty display name is resolved from
 * the store when the user has a faculty assigned.
 */
export const getMeTool: McpTool<typeof getMeSchema> = {
  name: "get-me",
  description:
    "Get the signed-in student's own account profile: id, display name, email, faculty (id + name), and account creation date. Use this to confirm the user's identity or faculty before personalizing advice.",
  inputSchema: getMeSchema,
  readOnly: true,
  run: async ({ user }) => {
    try {
      const name =
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.username;
      const profile: Record<string, unknown> = {
        id: user.id,
        name,
        email: user.email,
        facultyId: user.facultyId,
        createdAt: user.createdAt,
      };
      if (user.facultyId != null) {
        const faculty = await db.faculties.findUnique({
          where: { id: user.facultyId },
        });
        if (faculty) profile.facultyName = faculty.name;
      }
      return jsonText(profile);
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getUsageSchema = z.object({});

/**
 * get-usage: the signed-in student's assistant quota state, derived from the
 * same `getQuotaState` reader the assistant status surface uses. Usage is
 * tracked per calendar month (`period` = "YYYY-MM"), so `usedThisPeriod`/
 * `periodLimit` are the current period's used count and limit, and
 * `criticalFloor` is the remaining count at/below which usage is critical
 * (20% of the period limit, per the quota meter).
 */
export const getUsageTool: McpTool<typeof getUsageSchema> = {
  name: "get-usage",
  description:
    "Get the signed-in student's assistant quota state: messages used in the current period, the period limit, the critical floor (messages remaining at/below which usage is critical), messages remaining, and whether usage is critical. Use this to warn the student before they hit their monthly assistant limit.",
  inputSchema: getUsageSchema,
  readOnly: true,
  run: async ({ user }) => {
    try {
      const q = await getQuotaState(user.id);
      return jsonText({
        usedThisPeriod: q.used,
        periodLimit: q.quota,
        criticalFloor: q.criticalFloor,
        remaining: q.remaining,
        isCritical: q.isCritical,
        period: q.period,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
