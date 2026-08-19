// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

function Ping() {
  return <button>ping</button>;
}

describe("jsdom + RTL infra", () => {
  it("renders into jsdom and finds the element", () => {
    render(<Ping />);
    expect(screen.getByRole("button", { name: "ping" })).toBeTruthy();
  });
});
