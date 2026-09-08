import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { getTimetableCalendarLinkTool } from "./calendar-link";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeCaller(procs: Record<string, unknown>) {
  return {
    timetable: { getOrCreateIcalToken: procs.getOrCreateIcalToken },
    sharing: { setVisibility: procs.setVisibility },
  } as unknown as ToolContext["caller"];
}

describe("get-timetable-calendar-link", () => {
  it("returns links in viewProps and keeps the token OUT of the text", async () => {
    const fn = vi.fn().mockResolvedValue({ icalToken: "secret-token" });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getOrCreateIcalToken: fn }),
    };
    const result = await getTimetableCalendarLinkTool.run(ctx, {
      timetableId: "tt1",
      enableLinkSharing: false,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).not.toContain("secret-token");
    expect(result.viewProps?.feedUrl).toContain("/api/ical/secret-token");
    expect(String(result.viewProps?.googleSubscribeUrl)).toContain(
      "calendar.google.com",
    );
    expect(String(result.viewProps?.subscribeUrl)).toMatch(/^webcal:\/\//);
  });

  it("sets UNLISTED visibility only when enableLinkSharing=true AND confirm:true and the timetable is private", async () => {
    const tokenFn = vi
      .fn()
      .mockRejectedValueOnce(
        new Error(
          "Set your timetable to link-sharing before creating a calendar link",
        ),
      )
      .mockResolvedValueOnce({ icalToken: "secret-token" });
    const visFn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getOrCreateIcalToken: tokenFn,
        setVisibility: visFn,
      }),
    };
    const result = await getTimetableCalendarLinkTool.run(ctx, {
      timetableId: "tt1",
      enableLinkSharing: true,
      confirm: true,
    });
    expect(visFn).toHaveBeenCalledWith({
      entity: "timetable",
      id: "tt1",
      visibility: "UNLISTED",
    });
    expect(result.viewProps?.madeLinkShareable).toBe(true);
  });

  it("rejects the UNLISTED escalation when enableLinkSharing=true but confirm is missing", async () => {
    const tokenFn = vi
      .fn()
      .mockRejectedValue(
        new Error(
          "Set your timetable to link-sharing before creating a calendar link",
        ),
      );
    const visFn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getOrCreateIcalToken: tokenFn,
        setVisibility: visFn,
      }),
    };
    const result = await getTimetableCalendarLinkTool.run(ctx, {
      timetableId: "tt1",
      enableLinkSharing: true,
    });
    expect(visFn).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/confirm/);
  });

  it("propagates the private-timetable error when enableLinkSharing=false", async () => {
    const tokenFn = vi
      .fn()
      .mockRejectedValue(
        new Error(
          "Set your timetable to link-sharing before creating a calendar link",
        ),
      );
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getOrCreateIcalToken: tokenFn }),
    };
    const result = await getTimetableCalendarLinkTool.run(ctx, {
      timetableId: "tt1",
      enableLinkSharing: false,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("link-sharing");
  });

  it("returns errText when the caller rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getOrCreateIcalToken: fn }),
    };
    const result = await getTimetableCalendarLinkTool.run(ctx, {
      timetableId: "tt1",
      enableLinkSharing: false,
    });
    expect(result.isError).toBe(true);
    // Allowlist (Task 10) only sanitizes driver-shaped text; a bare "boom"
    // carries no internals and passes through verbatim.
    expect(result.content[0]!.text).toContain("boom");
  });

  it("does NOT flip visibility when probe fails with a non-private error even if enableLinkSharing=true and confirm:true", async () => {
    const tokenFn = vi.fn().mockRejectedValue(new Error("boom"));
    const visFn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getOrCreateIcalToken: tokenFn,
        setVisibility: visFn,
      }),
    };
    const result = await getTimetableCalendarLinkTool.run(ctx, {
      timetableId: "tt1",
      enableLinkSharing: true,
      confirm: true,
    });
    expect(visFn).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("boom");
  });

  it("sanitizes driver-shaped errors end-to-end (ECONNREFUSED + IP)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1:5432"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getOrCreateIcalToken: fn }),
    };
    const result = await getTimetableCalendarLinkTool.run(ctx, {
      timetableId: "tt1",
      enableLinkSharing: false,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/Something went wrong/);
    expect(result.content[0]!.text).not.toContain("10.0.0.1");
  });
});
