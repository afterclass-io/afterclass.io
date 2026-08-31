import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { z, ZodError } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { saveEntries } from "./roadmaps/saveEntries";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

const testRouter = createTRPCRouter({
  saveEntries,
  validateSample: publicProcedure
    .input(
      z.object({
        title: z.string().min(1, { error: "Title is required" }),
        rating: z.number().int().min(1).max(5),
        contactEmail: z.email({ error: "Invalid email address" }),
      }),
    )
    .mutation(({ input }) => input),
});

function makeCaller(sessionUser: { id: string } | null = null) {
  return testRouter.createCaller({
    db: {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          updatedAt: new Date("2026-08-01T00:00:00Z"),
        }),
      },
    },
    session: sessionUser ? { user: sessionUser } : null,
    headers: new Headers(),
  } as never);
}

describe("tRPC Error Path & Zod Error Formatting (Seam A)", () => {
  it("rejects invalid input with BAD_REQUEST and ZodError cause", async () => {
    const caller = makeCaller();

    const err = await caller
      .validateSample({
        title: "",
        rating: 10,
        contactEmail: "not-an-email",
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TRPCError);
    const trpcError = err as TRPCError;
    expect(trpcError.code).toBe("BAD_REQUEST");
    expect(trpcError.cause).toBeInstanceOf(ZodError);
  });

  it("formats ZodError into client-facing zodError payload matching external contract", () => {
    const schema = z.object({
      name: z.string().min(1),
      score: z.number().min(0).max(100),
    });

    const parseResult = schema.safeParse({ name: "", score: 150 });
    expect(parseResult.success).toBe(false);
    if (parseResult.success) {
      throw new Error("Expected parseResult.success to be false");
    }

    const trpcError = new TRPCError({
      code: "BAD_REQUEST",
      cause: parseResult.error,
    });

    const shape = {
      message: trpcError.message,
      code: -32600,
      data: {
        code: trpcError.code,
        httpStatus: 400,
        path: "validateSample",
      },
    };

    // eslint-disable-next-line no-underscore-dangle
    const formatted = testRouter._def._config.errorFormatter({
      shape,
      error: trpcError,
      type: "mutation",
      path: "validateSample",
      input: {},
      ctx: undefined,
    } as never);

    expect(formatted.data).toBeDefined();
    expect(formatted.data.zodError).toBeDefined();

    const zodError = formatted.data.zodError;
    const fieldErrors = zodError?.fieldErrors as
      | Record<string, string[]>
      | undefined;
    // External contract: { formErrors: string[], fieldErrors: Record<string, string[]> }
    expect(Array.isArray(zodError?.formErrors)).toBe(true);
    expect(zodError?.fieldErrors).toBeTypeOf("object");
    expect(Array.isArray(fieldErrors?.score)).toBe(true);
    expect(fieldErrors?.score?.length).toBeGreaterThan(0);
  });

  it("rejects roadmaps.saveEntries on invalid enum term value", async () => {
    const caller = makeCaller({ id: "u1" });

    const err = await caller
      .saveEntries({
        roadmapId: "r1",
        entries: [
          {
            courseId: "c1",
            yearNumber: 1,
            term: "INVALID_TERM" as never,
            sortOrder: 0,
          },
        ],
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TRPCError);
    const trpcError = err as TRPCError;
    expect(trpcError.code).toBe("BAD_REQUEST");
    expect(trpcError.cause).toBeInstanceOf(ZodError);
  });
});
