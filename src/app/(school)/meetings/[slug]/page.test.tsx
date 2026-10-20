import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  getPollBySlug: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ auth: m.auth }));
vi.mock("@/common/tools/trpc/server", () => ({
  api: { meetings: { getPollBySlug: m.getPollBySlug } },
}));
vi.mock("@/common/components/auth-wall", () => ({
  AuthWall: ({ feature }: { feature: string }) => (
    <div data-stub="wall">{feature}</div>
  ),
}));
vi.mock("@/modules/meetings/components/room/MeetingRoomView", () => ({
  MeetingRoomView: ({ slug }: { slug: string }) => (
    <div data-stub="room">{slug}</div>
  ),
}));

import MeetingRoomPage, { generateMetadata } from "./page";

const props = { params: Promise.resolve({ slug: "abcdefghij" }) };
const noIndex = { index: false, follow: false, nocache: true };

describe("meeting poll page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the auth wall to anonymous visitors without reading the poll", async () => {
    m.auth.mockResolvedValue(null);

    const html = renderToStaticMarkup(await MeetingRoomPage(props));

    expect(html).toContain('data-stub="wall"');
    expect(html).toContain("this meeting");
    expect(html).not.toContain('data-stub="room"');
    expect(m.getPollBySlug).not.toHaveBeenCalled();
  });

  it("gives anonymous visitors generic noindex metadata without reading the poll", async () => {
    m.auth.mockResolvedValue(null);

    const metadata = await generateMetadata(props);

    expect(metadata.title).toBe("Meeting | Meetings");
    expect(metadata.robots).toEqual(noIndex);
    expect(m.getPollBySlug).not.toHaveBeenCalled();
  });

  it("renders the meeting room for signed-in users", async () => {
    m.auth.mockResolvedValue({ user: { id: "u1" } });

    const html = renderToStaticMarkup(await MeetingRoomPage(props));

    expect(html).toContain('data-stub="room"');
    expect(html).toContain("abcdefghij");
    expect(html).not.toContain('data-stub="wall"');
  });

  it("titles signed-in metadata with the poll", async () => {
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    m.getPollBySlug.mockResolvedValue({
      poll: { title: "CS201 Sync", description: null },
    });

    const metadata = await generateMetadata(props);

    expect(metadata.title).toBe("CS201 Sync | Meetings");
    expect(metadata.robots).toEqual(noIndex);
  });
});
