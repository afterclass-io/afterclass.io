import { describe, expect, it } from "vitest";

import { scopeLabel } from "./page";

describe("scopeLabel", () => {
  it("maps known scopes to plain language", () => {
    expect(scopeLabel("email")).toBe("Email address");
    expect(scopeLabel("offline_access")).toBe(
      "Stay connected when you're away",
    );
  });

  it("passes unknown scopes through", () => {
    expect(scopeLabel("custom_future")).toBe("custom_future");
  });
});
