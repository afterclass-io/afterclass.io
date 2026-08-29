import { z } from "zod";

import { env } from "@/env";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const getContributeInfoSchema = z.object({});

export const getContributeInfoTool: McpTool<typeof getContributeInfoSchema> = {
  name: "get-contribute-info",
  description:
    "Get links for contacting the afterclass.io developers and contributing: open-source GitHub repo, helpdesk, Telegram channel, and where to write a review.",
  inputSchema: getContributeInfoSchema,
  readOnly: true,
  run: async () => {
    try {
      return jsonText({
        github: env.NEXT_PUBLIC_AC_GITHUB_LINK,
        helpdesk: env.NEXT_PUBLIC_AC_HELPDESK_LINK,
        telegramChannel: env.NEXT_PUBLIC_AC_CHANNEL_LINK,
        writeAReview: `${env.NEXT_PUBLIC_SITE_URL}/submit`,
        statistics: `${env.NEXT_PUBLIC_SITE_URL}/statistics`,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
