import type { PrismaClient } from "@/generated/prisma/client";
import { vi } from "vitest";

// Every server/api unit test builds a router caller against a mocked db.
// @/server/api/trpc imports @/server/db, @/server/auth, and @sentry/nextjs at
// module scope, so all three must be mocked before trpc.ts is evaluated.
// Import this module before importing @/server/api/trpc so these mocks are
// registered first (vi.mock calls below are hoisted to the top of this file,
// which — as long as this import comes before the trpc.ts import in the test
// file — runs before trpc.ts's real imports do). Re-exporting createTRPCRouter
// from here instead doesn't work: Vitest's vi.mock hoisting isn't honored
// through an `export ... from` re-export, only through the test file's own
// `import` statements.
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

// `isVerified` is optional so procedures gating on it (e.g. roadmaps.publish,
// sharing.setVisibility) can be exercised without every caller spelling it out.
type MockSession = { user: { id: string; isVerified?: boolean } } | null;

// A partial stand-in for the Prisma client: keys must be real client members
// (a typo'd model name — `userRoadmaps` for `userRoadmap` — is a compile
// error), values are left `unknown` since each test mocks only the handful of
// methods it exercises. A real `PrismaClient` also satisfies this (integration
// tests pass one through).
type MockDb = Partial<Record<keyof PrismaClient, unknown>>;

/**
 * Builds a router caller against a mocked db, matching createTRPCContext's
 * shape. Takes `router.createCaller` itself (rather than the router) so
 * TCaller infers directly from that function value's own return type —
 * inferring through a generic `router: TRouter extends AnyTRPCRouter`
 * parameter instead widens the result to
 * `DecorateRouterRecord<any> | DecorateProcedure<any>`.
 */
export function makeCaller<TCaller>(
  createCaller: (ctx: never) => TCaller,
  dbMock: MockDb,
  session: MockSession = { user: { id: "u1" } },
): TCaller {
  return createCaller({
    db: dbMock,
    session,
    headers: new Headers(),
  } as never);
}
