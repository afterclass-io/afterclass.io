import { createTRPCRouter } from "@/server/api/trpc";
import { createPoll } from "./createPoll";
import { getCreateOptions } from "./getCreateOptions";
import { getPollBySlug } from "./getPollBySlug";
import { joinPoll } from "./joinPoll";
import { updatePoll } from "./updatePoll";
import { submitAvailability } from "./submitAvailability";
import { listMyMeetings } from "./listMyMeetings";
import { deletePoll } from "./deletePoll";

export const meetingsRouter = createTRPCRouter({
  createPoll,
  getCreateOptions,
  getPollBySlug,
  joinPoll,
  updatePoll,
  submitAvailability,
  listMyMeetings,
  deletePoll,
});
