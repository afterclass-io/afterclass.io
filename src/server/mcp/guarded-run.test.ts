import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  errText,
  errorMessage,
  guardedRun,
  okText,
  type ToolContext,
} from "./types";

const ctx = {} as ToolContext;

describe("guardedRun", () => {
  it("passes a successful result and the arguments through", async () => {
    const fn = vi.fn(async (_c: ToolContext, input: { n: number }) =>
      okText(`n=${input.n}`),
    );
    const result = await guardedRun(fn)(ctx, { n: 2 });
    expect(result).toEqual(okText("n=2"));
    expect(fn).toHaveBeenCalledWith(ctx, { n: 2 });
  });

  it("passes an error result returned by the body through unchanged", async () => {
    const result = await guardedRun(async () => errText("nope"))(ctx, {});
    expect(result).toEqual(errText("nope"));
  });

  it("maps a thrown Error to errText(errorMessage(e))", async () => {
    const error = new Error("plain failure");
    const result = await guardedRun(async () => {
      throw error;
    })(ctx, {});
    expect(result).toEqual(errText(errorMessage(error)));
  });

  it("maps a thrown TRPCError to its message", async () => {
    const result = await guardedRun(async () => {
      throw new TRPCError({ code: "NOT_FOUND", message: "Course X not found" });
    })(ctx, {});
    expect(result).toEqual(errText("Course X not found"));
  });

  it("maps a constraint violation to the generic retry message", async () => {
    const result = await guardedRun(async () => {
      throw new Error("Unique constraint failed on the fields: (`id`)");
    })(ctx, {});
    expect(result).toEqual(
      errText("Could not complete that change — refresh and try again."),
    );
  });
});
