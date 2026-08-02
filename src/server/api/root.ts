import { acadTermsRouter } from "@/server/api/acadTerms/router";
import { bidResultsRouter } from "@/server/api/bidResults/router";
import { bidPredictionsRouter } from "@/server/api/bidPredictions/router";
import { bidWindowsRouter } from "@/server/api/bidWindows/router";
import { coursesRouter } from "@/server/api/courses/router";
import { classesRouter } from "@/server/api/classes/router";
import { facultiesRouter } from "@/server/api/faculties/router";
import { labelsRouter } from "@/server/api/labels/router";
import { professorsRouter } from "@/server/api/professors/router";
import { reviewsRouter } from "@/server/api/reviews/router";
import { reviewEventsRouter } from "@/server/api/reviewEvents/router";
import { reviewReactionsRouter } from "@/server/api/reviewReactions/router";
import { reviewVotesRouter } from "@/server/api/reviewVotes/router";
import { roadmapReactionsRouter } from "@/server/api/roadmapReactions/router";
import { roadmapsRouter } from "@/server/api/roadmaps/router";
import { roadmapVotesRouter } from "@/server/api/roadmapVotes/router";
import { safetyFactorsRouter } from "@/server/api/safetyFactors/router";
import { sharingRouter } from "@/server/api/sharing/router";
import { timetableRouter } from "@/server/api/timetable/router";
import { userBidsRouter } from "@/server/api/userBids/router";
import { usersRouter } from "@/server/api/users/router";

import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  acadTerms: acadTermsRouter,
  bidResults: bidResultsRouter,
  bidPredictions: bidPredictionsRouter,
  bidWindows: bidWindowsRouter,
  classes: classesRouter,
  courses: coursesRouter,
  faculties: facultiesRouter,
  labels: labelsRouter,
  professors: professorsRouter,
  reviews: reviewsRouter,
  reviewEvents: reviewEventsRouter,
  reviewReactions: reviewReactionsRouter,
  reviewVotes: reviewVotesRouter,
  roadmapReactions: roadmapReactionsRouter,
  roadmaps: roadmapsRouter,
  roadmapVotes: roadmapVotesRouter,
  safetyFactors: safetyFactorsRouter,
  sharing: sharingRouter,
  timetable: timetableRouter,
  userBids: userBidsRouter,
  users: usersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
