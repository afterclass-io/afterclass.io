// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ConsentCard,
  ConsentError,
  ConsentSignIn,
  requesterLabel,
  scopeLabel,
} from "./consent-ui";

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

describe("ConsentError", () => {  it("renders the error message with a Retry action", () => {
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

describe("requesterLabel", () => {
  it("maps the user_bound_custom-mcp redirect to the AI agent label", () => {
    expect(
      requesterLabel(
        "Google",
        "https://oauth-redirect.googleusercontent.com/r/user_bound_custom-mcp-107023827359948230403-afterclass-io-afterclass_vercel_app",
      ),
    ).toBe("Your AI agent (via Google)");
  });

  it("falls back to the client name for other redirects", () => {
    expect(requesterLabel("Google", "https://client.example/cb")).toBe(
      "Google",
    );
  });

  it("falls back to This app when no client name is given", () => {
    expect(requesterLabel(undefined, undefined)).toBe("This app");
  });
});

describe("ConsentCard", () => {
  const geminiDetails = {
    status: "details",
    client: { name: "Google", id: "3e3aa4a2-753a-4fa3-bd42-eb44eecff143" },
    scope: "openid profile email",
    redirect_uri:
      "https://oauth-redirect.googleusercontent.com/r/user_bound_custom-mcp-107023827359948230403-www_afterclass_io",
  } as const;

  it("attributes the request to the AI agent, not Google login", () => {
    render(
      <ConsentCard
        details={{ ...geminiDetails }}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    // The label is split across <strong> + description text nodes.
    const description = screen.getByText(/is requesting access/i);
    expect(description.textContent).toMatch(
      /your ai agent \(via google\) is requesting access/i,
    );
    expect(description.textContent).not.toMatch(/^google is requesting/i);
  });

  it("wraps long client id and redirect uri values", () => {
    const { container } = render(
      <ConsentCard
        details={{ ...geminiDetails }}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    for (const code of Array.from(container.querySelectorAll("code"))) {
      expect(code.className).toMatch(/break-all/);
    }
  });
});
