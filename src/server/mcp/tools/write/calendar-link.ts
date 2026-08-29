import { z } from "zod";

import { env } from "@/env";
import { buildCalendarLinks } from "@/modules/timetable/functions/calendar-links";

import { errText, errorMessage, okText, type McpTool } from "../../types";

const getTimetableCalendarLinkSchema = z.object({
  timetableId: z.string().describe("Timetable id from my-timetables"),
  enableLinkSharing: z
    .boolean()
    .default(false)
    .describe(
      "Set true ONLY after the user explicitly agrees to make this timetable link-shareable (UNLISTED). Required when the timetable is still private.",
    ),
});

export const getTimetableCalendarLinkTool: McpTool<typeof getTimetableCalendarLinkSchema> = {
  name: "get-timetable-calendar-link",
  description:
    "Get calendar subscribe links (Google / Apple / Outlook + ICS feed) for one of the user's timetables, so their calendar stays in sync automatically. If the timetable is private, the user must first agree to link-sharing (enableLinkSharing=true). Links render in a widget; never ask the user for tokens.",
  inputSchema: getTimetableCalendarLinkSchema,
  readOnly: false,
  widgetName: "calendar-links",
  run: async ({ caller }, { timetableId, enableLinkSharing }) => {
    try {
      let madeLinkShareable = false;
      try {
        await caller.timetable.getOrCreateIcalToken({ timetableId });
      } catch (e) {
        // PRIVATE timetables refuse to mint a token — flip to UNLISTED only
        // when the user explicitly opted in, then retry the mint.
        if (!enableLinkSharing) throw e;
        await caller.sharing.setVisibility({ entity: "timetable", id: timetableId, visibility: "UNLISTED" });
        madeLinkShareable = true;
      }
      const { icalToken } = await caller.timetable.getOrCreateIcalToken({ timetableId });
      const links = buildCalendarLinks(env.NEXT_PUBLIC_SITE_URL, icalToken);
      return {
        // Model sees NO token-bearing URLs — they go to the widget only.
        ...okText(
          "Calendar subscribe links are shown in the widget. The feed stays in sync automatically when the timetable changes." +
            (madeLinkShareable
              ? " The timetable is now link-shareable (UNLISTED)."
              : "") +
            " If the widget is not visible, the user can also export from the Timetable page on the site.",
        ),
        widgetProps: { timetableId, madeLinkShareable, ...links },
      };
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
