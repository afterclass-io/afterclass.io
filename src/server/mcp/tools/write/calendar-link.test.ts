import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { getTimetableCalendarLinkTool } from "./calendar-link";

const fakeUser: SessionUser = {
  id: "u1", email: "a@smu.edu.sg", username: "u1", isVerified: true,
  universityId: 1, firstName: null, lastName: null, telegramId: null,
  photoUrl: null, facultyId: null, createdAt: new Date(), updatedAt: new Date(),
};

function makeCaller(procs: Record<string, unknown>) {
  return {
    timetable: { getOrCreateIcalToken: procs.getOrCreateIcalToken },
    sharing: { setVisibility: procs.setVisibility },
  } as unknown as ToolContext["caller"];
}

describe("get-timetable-calendar-link", () => {
  it("returns links in widgetProps and keeps the token OUT of the text", async () => {
    const fn = vi.fn().mockResolvedValue({ icalToken: "secret-token" });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getOrCreateIcalToken: fn }) };
    const result = await getTimetableCalendarLinkTool.run(ctx, { timetableId: "tt1", enableLinkSharing: false });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).not.toContain("secret-token");
    expect(result.widgetProps?.feedUrl).toContain("/api/ical/secret-token");
    expect(String(result.widgetProps?.googleSubscribeUrl)).toContain("calendar.google.com");
    expect(String(result.widgetProps?.subscribeUrl)).toMatch(/^webcal:\/\//);
  });

  it("sets UNLISTED visibility only when enableLinkSharing=true and the timetable is private", async () => {
    const tokenFn = vi.fn()
      .mockRejectedValueOnce(new Error("Set your timetable to link-sharing before creating a calendar link"))
      .mockResolvedValueOnce({ icalToken: "secret-token" });
    const visFn = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getOrCreateIcalToken: tokenFn, setVisibility: visFn }) };
    const result = await getTimetableCalendarLinkTool.run(ctx, { timetableId: "tt1", enableLinkSharing: true });
    expect(visFn).toHaveBeenCalledWith({ entity: "timetable", id: "tt1", visibility: "UNLISTED" });
    expect(result.widgetProps?.madeLinkShareable).toBe(true);
  });

  it("propagates the private-timetable error when enableLinkSharing=false", async () => {
    const tokenFn = vi.fn().mockRejectedValue(new Error("Set your timetable to link-sharing before creating a calendar link"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getOrCreateIcalToken: tokenFn }) };
    const result = await getTimetableCalendarLinkTool.run(ctx, { timetableId: "tt1", enableLinkSharing: false });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("link-sharing");
  });

  it("returns errText when the caller rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getOrCreateIcalToken: fn }) };
    const result = await getTimetableCalendarLinkTool.run(ctx, { timetableId: "tt1", enableLinkSharing: false });
    expect(result.isError).toBe(true);
  });
});
