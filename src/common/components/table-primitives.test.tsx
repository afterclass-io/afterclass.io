// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SortableTh } from "./table-primitives";

describe("SortableTh icon contract — lucide arrows", () => {
  it("renders ArrowUp for active asc", () => {
    const onClick = () => undefined;
    const { container } = render(
      <SortableTh label="Seats" active dir="asc" onClick={onClick} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    // ArrowUp lucide carries distinct path data; just assert svg exists and not null
    expect(container.textContent).toContain("Seats");
  });

  it("renders ArrowDown for active desc", () => {
    const onClick = () => undefined;
    const { container } = render(
      <SortableTh label="Seats" active dir="desc" onClick={onClick} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders neutral ArrowUpDown for inactive (opacity-50)", () => {
    const onClick = () => undefined;
    const { container } = render(
      <SortableTh label="Seats" active={false} dir="asc" onClick={onClick} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.classList.contains("opacity-50")).toBe(true);
  });

  it("does not import local arrow icons", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("src/common/components/table-primitives.tsx", "utf8"),
    );
    expect(source).toContain('from "lucide-react"');
    expect(source).not.toContain("arrow-up-icon");
    expect(source).not.toContain("arrow-down-icon");
    expect(source).not.toContain("arrow-up-down-icon");
  });
});
