import { coursesRouter } from "@/server/api/courses/router";
import { labelsRouter } from "@/server/api/labels/router";
import { professorsRouter } from "@/server/api/professors/router";
import { reviewsRouter } from "@/server/api/reviews/router";
import { reviewEventsRouter } from "@/server/api/reviewEvents/router";
import { reviewVotesRouter } from "@/server/api/reviewVotes/router";

import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  courses: coursesRouter,
  labels: labelsRouter,
  professors: professorsRouter,
  reviews: reviewsRouter,
  reviewEvents: reviewEventsRouter,
  reviewVotes: reviewVotesRouter,
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
