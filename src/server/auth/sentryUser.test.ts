import * as Sentry from "@sentry/nextjs";
import { describe, expect, it, vi } from "vitest";

import { setSentryUser } from "./sentryUser";

// Only `setUser` is mocked on purpose: reintroducing `getGlobalScope()` here
// fails loudly ("not a function") instead of passing silently.
vi.mock("@sentry/nextjs", () => ({ setUser: vi.fn() }));

describe("setSentryUser", () => {
  it("sends only id/email/username, dropping the rest of the user row", () => {
    setSentryUser({
      user: {
        id: "u1",
        email: "amy@smu.edu.sg",
        username: "amy",
        deprecatedPasswordDigest: "$2b$10$hunter2",
        firstName: "Amy",
      },
    } as never);

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: "u1",
      email: "amy@smu.edu.sg",
      username: "amy",
    });
  });

  it("clears the user when there is no session", () => {
    setSentryUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});
