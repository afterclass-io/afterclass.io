// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { McpRecommendation } from "./mcp-recommendation";

beforeEach(() => {
  window.sessionStorage.clear();
});

function renderCard(hasConnectedAgent = false) {
  const onDismiss = vi.fn();
  render(<McpRecommendation hasConnectedAgent={hasConnectedAgent} onDismiss={onDismiss} />);
  return { onDismiss };
}

describe("McpRecommendation", () => {
  it("renders for unconnected users", () => {
    renderCard();
    expect(screen.getByText(/get unlimited/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /set up mcp/i })).toBeInTheDocument();
  });

  it("is hidden when an agent is already connected", () => {
    renderCard(true);
    expect(screen.queryByText(/get unlimited/i)).not.toBeInTheDocument();
  });

  it("hides on dismiss, then REAPPEARS after a remount (dismiss is not persisted)", () => {
    const { onDismiss } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/get unlimited/i)).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalled();

    // Fresh mount in the same tab must show the card again - the bug: the old
    // sessionStorage key kept it hidden forever after a refresh.
    renderCard();
    expect(screen.getByText(/get unlimited/i)).toBeInTheDocument();
  });
});
