import { createTRPCRouter } from "@/server/api/trpc";

import { report } from "./report";

export const moderationRouter = createTRPCRouter({ report });
