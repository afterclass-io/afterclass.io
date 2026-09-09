// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOKENS } from "../tokens";
import { buildChartPoints } from "../utils/chart-points";
import { HistoryTable } from "./HistoryTable";

const points = buildChartPoints([
  { acadTermId: "AY2024/25-T1", round: "1", window: 1, min: 10, median: 22 },
  { acadTermId: "AY2024/25-T1", round: "1A", window: 2, min: 12, median: 25 },
  { acadTermId: "AY2025/26-T1", round: "1", window: 1, min: 14, median: 28 },
]);

describe("HistoryTable", () => {
  it("renders newest-first with term labels and min/median cells", () => {
    render(<HistoryTable points={points} c={TOKENS.light} />);
    const table = screen.getByRole("table");
    // AY2024/25-T1 spans two rows — assert per-occurrence.
    expect(within(table).getAllByText("AY2024/25-T1")).toHaveLength(2);
    expect(within(table).getByText("AY2025/26-T1")).toBeInTheDocument();
    const firstRow = within(table).getAllByRole("row")[1];
    expect(within(firstRow!).getByText("14")).toBeInTheDocument();
    expect(within(firstRow!).getByText("28")).toBeInTheDocument();
  });

  it("sorts by median when the column header is clicked", () => {
    render(<HistoryTable points={points} c={TOKENS.light} />);
    fireEvent.click(screen.getByRole("columnheader", { name: /median/i }));
    const table = screen.getByRole("table");
    const bodyRows = within(table).getAllByRole("row").slice(1);
    const medians = bodyRows.map((r) => {
      const cells = within(r).getAllByRole("cell");
      return Number(cells[cells.length - 1]?.textContent);
    });
    expect(medians).toEqual([...medians].sort((a, b) => a - b));
  });

  it("shows the first 10 rows with an expand control for longer histories", () => {
    // Unique term/window per row: grouping is by term+round+window key.
    const long = buildChartPoints(
      Array.from({ length: 12 }, (_, i) => ({
        acadTermId: `AY2024/25-T${(i % 3) + 1}`,
        round: "1",
        window: i + 1,
        min: 10 + i,
        median: 20 + i,
      })),
    );
    render(<HistoryTable points={long} c={TOKENS.light} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(11); // header + 10
    fireEvent.click(screen.getByRole("button", { name: /show all/i }));
    expect(within(table).getAllByRole("row")).toHaveLength(13); // header + 12
  });
});
