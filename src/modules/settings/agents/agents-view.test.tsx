// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentsView } from "./agents-view";

describe("AgentsView", () => {
  it("signed-out prompts Google sign-in with a login link", () => {
    render(<AgentsView state={{ kind: "signed-out" }} />);
    expect(
      screen.getByText("Sign in to view your connected agents"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Sign in with Google" }),
    ).toHaveAttribute(
      "href",
      "/account/auth/login?callbackUrl=%2Fsettings%2Fagents",
    );
  });

  it("no-token explains the Google sign-in retry with a connect link", () => {
    render(<AgentsView state={{ kind: "no-token" }} />);
    expect(
      screen.getByText("Sign in with Google to connect an agent"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Connect your agent" }),
    ).toHaveAttribute("href", "/mcp");
  });

  it("error renders an alert with the retry copy", () => {
    render(<AgentsView state={{ kind: "error" }} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText("Could not load connected agents"),
    ).toBeInTheDocument();
  });

  it("ready with no grants shows the empty state with a connect action", () => {
    render(<AgentsView state={{ kind: "ready", grants: [] }} />);
    expect(screen.getByText("No agents connected yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Connect your agent" }),
    ).toHaveAttribute("href", "/mcp");
  });

  it("ready with grants lists each agent with a labelled revoke button", () => {
    render(
      <AgentsView
        state={{
          kind: "ready",
          grants: [
            { id: "g1", client_id: "cl1", client_name: "Gemini", scopes: [] },
          ],
        }}
      />,
    );
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    const hidden = document.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="clientId"]',
    )!;
    expect(hidden.value).toBe("cl1");
    expect(
      screen.getByRole("button", { name: "Revoke Gemini" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Connect another agent" }),
    ).toHaveAttribute("href", "/mcp");
  });

  it("ready with multiple grants renders one revoke button per grant", () => {
    render(
      <AgentsView
        state={{
          kind: "ready",
          grants: [
            { id: "g1", client_id: "cl1", client_name: "Claude", scopes: [] },
            { id: "g2", client_id: "cl2", client_name: "ChatGPT", scopes: [] },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Revoke Claude" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revoke ChatGPT" }),
    ).toBeInTheDocument();
  });
});
