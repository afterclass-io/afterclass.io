import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const getMyMeetingsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .optional()
    .describe("Max number of meetings to return (default: 5, max: 20)"),
});

export const getMyMeetingsTool: McpTool<typeof getMyMeetingsSchema> = {
  name: "get-my-meetings",
  description:
    "List the group meetings and availability polls the user created or joined.",
  inputSchema: getMyMeetingsSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      const meetings = await caller.meetings.listMyMeetings();
      const limit = input?.limit ?? 5;
      const limited = meetings.slice(0, limit);
      return jsonText({
        meetings: limited.map((m) => ({
          id: m.id,
          slug: m.slug,
          title: m.title,
          description: m.description,
          startDate: m.startDate,
          endDate: m.endDate,
          course: m.course ? { code: m.course.code, name: m.course.name } : null,
          section: m.section,
          teamIdentifier: m.teamIdentifier,
          participantCount: m.participantCount,
          isCreator: m.isCreator,
          url: `/meetings/${m.slug}`,
        })),
        total: meetings.length,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getMeetingPollDetailSchema = z.object({
  slug: z.string().describe("The 10-character slug of the meeting poll"),
});

export const getMeetingPollDetailTool: McpTool<typeof getMeetingPollDetailSchema> = {
  name: "get-meeting-poll-detail",
  description:
    "Get full details, participants, and aggregate availability heatmap for a group meeting poll by its slug.",
  inputSchema: getMeetingPollDetailSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      const detail = await caller.meetings.getPollBySlug({ slug: input.slug });
      return jsonText({
        poll: detail.poll,
        participantCount: detail.participants.length,
        participants: detail.participants.map((p) => ({
          participantId: p.participantId,
          name: p.name,
          availableSlotsCount: p.availableSlots.length,
          ifNeededSlotsCount: p.ifNeededSlots.length,
          isCurrentUser: p.isCurrentUser,
        })),
        url: `/meetings/${detail.poll.slug}`,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
