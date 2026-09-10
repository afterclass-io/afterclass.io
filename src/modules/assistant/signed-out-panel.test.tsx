// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/assistant",
}));

import { SignedOutPanel } from "./signed-out-panel";

describe("SignedOutPanel", () => {
  it("renders the server-provided quota, not a hardcoded number", () => {
    render(<SignedOutPanel quota={30} />);
    expect(screen.getByText(/Free quota is 30 messages\/month/)).toBeTruthy();
  });

  it("falls back to 20 when status has not loaded", () => {
    render(<SignedOutPanel quota={undefined} />);
    expect(screen.getByText(/Free quota is 20 messages\/month/)).toBeTruthy();
  });
});
