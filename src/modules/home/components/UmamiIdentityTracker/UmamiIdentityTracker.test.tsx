// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  identify: vi.fn(),
  session: null as { user: Record<string, string> } | null,
}));

vi.mock("@/common/hooks/use-umami", () => ({
  default: () => ({ identify: m.identify }),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: m.session }),
}));

import { UmamiIdentityTracker } from "./UmamiIdentityTracker";

describe("UmamiIdentityTracker", () => {
  it("identifies a signed-in user by id only, never by personal data", () => {
    m.identify.mockReset();
    m.session = {
      user: {
        id: "user-1",
        email: "student@smu.edu.sg",
        firstName: "Ada",
        lastName: "Lovelace",
        telegramId: "ada_tg",
        name: "Ada Lovelace",
      },
    };
    render(<UmamiIdentityTracker />);
    expect(m.identify).toHaveBeenCalledTimes(1);
    expect(m.identify).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("does not identify an anonymous visitor", () => {
    m.identify.mockReset();
    m.session = null;
    render(<UmamiIdentityTracker />);
    expect(m.identify).not.toHaveBeenCalled();
  });
});
