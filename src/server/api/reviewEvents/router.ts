import { createTRPCRouter } from "@/server/api/trpc";

import { track } from "./track";
import { countEvent } from "./countEvent";

export const reviewEventsRouter = createTRPCRouter({
  track,
  countEvent,
});
