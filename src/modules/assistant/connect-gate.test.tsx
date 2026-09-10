// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectGate } from "./connect-gate";

describe("ConnectGate", () => {
  it("renders the quota copy with the agent-connect link", () => {
    render(<ConnectGate reason="quota" />);
    expect(
      screen.getByText("You've used your free messages this month."),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Connect your own AI agent.*unlimited and always available/,
      ),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: "Connect your agent" });
    expect(link.getAttribute("href")).toBe("/mcp");
  });

  it("renders the consent copy with the privacy link and no connect CTA", () => {
    render(<ConnectGate reason="consent" />);
    expect(
      screen.getByText("Please consent to AI use before chatting."),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: "privacy" });
    expect(link.getAttribute("href")).toBe("/privacy");
    expect(
      screen.queryByRole("link", { name: "Connect your agent" }),
    ).toBeNull();
  });
});
