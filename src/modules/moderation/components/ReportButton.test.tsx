// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type MutationOpts = {
  onSuccess?: () => void;
  onError?: (e: { data?: { code?: string } | null }) => void;
};

type HoistedState = {
  mutate: ReturnType<typeof vi.fn>;
  opts: MutationOpts;
  session: { status: string; data: { user: { username: string } } | null };
  ecfg: { enableContentModeration: boolean };
  toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
};

const m = vi.hoisted((): HoistedState => ({
  mutate: vi.fn(),
  opts: {},
  session: {
    status: "authenticated",
    data: { user: { username: "viewer" } },
  },
  ecfg: { enableContentModeration: true },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    moderation: {
      report: {
        useMutation: (opts: MutationOpts) => {
          m.opts = opts;
          return { mutate: m.mutate, isPending: false };
        },
      },
    },
  },
}));
vi.mock("next-auth/react", () => ({ useSession: () => m.session }));
vi.mock("@/common/hooks", () => ({ useEdgeConfigs: () => m.ecfg }));
vi.mock("sonner", () => ({ toast: m.toast }));

import { REPORT_CONFIRMATION, ReportButton } from "./ReportButton";

beforeEach(() => {
  vi.clearAllMocks();
  m.session = {
    status: "authenticated",
    data: { user: { username: "viewer" } },
  };
  m.ecfg = { enableContentModeration: true };
});
afterEach(cleanup);

describe("ReportButton", () => {
  it("renders nothing when the master flag is off", () => {
    m.ecfg = { enableContentModeration: false };
    render(<ReportButton surface="review" refId="rv1" />);
    expect(screen.queryByRole("button", { name: "Report" })).toBeNull();
  });

  it("renders nothing for signed-out visitors", () => {
    m.session = { status: "unauthenticated", data: null };
    render(<ReportButton surface="review" refId="rv1" />);
    expect(screen.queryByRole("button", { name: "Report" })).toBeNull();
  });

  it("renders nothing for the item's owner", () => {
    render(
      <ReportButton surface="roadmap" refId="r1" ownerUsername="viewer" />,
    );
    expect(screen.queryByRole("button", { name: "Report" })).toBeNull();
  });

  it("reports the item on click", async () => {
    render(
      <ReportButton surface="timetable" refId="tok" ownerUsername="someone" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Report" }));
    expect(m.mutate).toHaveBeenCalledWith({ surface: "timetable", ref: "tok" });
  });

  it("shows the same confirmation for success and for an unverified reporter", () => {
    render(<ReportButton surface="review" refId="rv1" />);
    m.opts.onSuccess?.();
    m.opts.onError?.({ data: { code: "FORBIDDEN" } });
    expect(m.toast.success).toHaveBeenCalledTimes(2);
    expect(m.toast.success).toHaveBeenNthCalledWith(
      1,
      REPORT_CONFIRMATION,
      expect.anything(),
    );
    expect(m.toast.success).toHaveBeenNthCalledWith(
      2,
      REPORT_CONFIRMATION,
      expect.anything(),
    );
    expect(m.toast.error).not.toHaveBeenCalled();
  });

  it("explains a rate limit and any other refusal without item details", () => {
    render(<ReportButton surface="review" refId="rv1" />);
    m.opts.onError?.({ data: { code: "TOO_MANY_REQUESTS" } });
    m.opts.onError?.({ data: { code: "PRECONDITION_FAILED" } });
    expect(m.toast.error).toHaveBeenNthCalledWith(
      1,
      "You're reporting too quickly. Try again later.",
    );
    expect(m.toast.error).toHaveBeenNthCalledWith(
      2,
      "Reporting is unavailable right now.",
    );
  });
});
