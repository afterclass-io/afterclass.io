// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConsentError, ConsentSignIn, scopeLabel } from "./consent-ui";

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

describe("ConsentSignIn", () => {
  it("renders a Sign in with Google link pointing at loginHref", () => {
    const loginHref =
      "/account/auth/login?callbackUrl=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc";
    render(<ConsentSignIn loginHref={loginHref} />);

    const link = screen.getByRole("link", { name: /sign in with google/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe(loginHref);
  });
});

describe("ConsentError", () => {
  it("renders the error message with a Retry action", () => {
    const onRetry = vi.fn();
    render(
      <ConsentError
        message="Could not load authorization details."
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByText("Could not load authorization details."),
    ).toBeDefined();
    const retry = screen.getByRole("button", { name: /^retry$/i });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders a Sign in with Google option alongside Retry when loginHref is provided", () => {
    const loginHref =
      "/account/auth/login?callbackUrl=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc";
    const onRetry = vi.fn();
    render(
      <ConsentError
        message="Invalid authorization request."
        onRetry={onRetry}
        loginHref={loginHref}
      />,
    );

    expect(screen.getByRole("button", { name: /^retry$/i })).toBeDefined();
    const link = screen.getByRole("link", { name: /sign in with google/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe(loginHref);
  });

  it("omits the sign-in option when loginHref is absent", () => {
    const onRetry = vi.fn();
    render(
      <ConsentError message="Consent request failed." onRetry={onRetry} />,
    );

    expect(screen.getByRole("button", { name: /^retry$/i })).toBeDefined();
    expect(
      screen.queryByRole("link", { name: /sign in with google/i }),
    ).toBeNull();
  });
});
