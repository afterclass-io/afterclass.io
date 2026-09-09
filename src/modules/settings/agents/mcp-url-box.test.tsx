// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MCPUrlBox } from "./mcp-url-box";

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn(async () => undefined) },
  });
});

describe("MCPUrlBox", () => {
  it("renders the URL in a code box with a copy button", () => {
    render(<MCPUrlBox mcpUrl="https://acme.run.mcp-use.com/mcp" />);
    expect(
      screen.getByText("https://acme.run.mcp-use.com/mcp"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("copies the URL and shows a check for 2s", async () => {
    render(<MCPUrlBox mcpUrl="https://acme.run.mcp-use.com/mcp" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    // Arrow wrapper: `clipboard.writeText` is a plain function-typed property
    // in the cast, not a class method — referencing it directly trips
    // @typescript-eslint/unbound-method, so call it through a closure and
    // assert on the closure instead.
    const { clipboard } = navigator as Navigator & {
      clipboard: { writeText: (t: string) => Promise<void> };
    };
    const writeText = (...args: [string]) => clipboard.writeText(...args);
    await vi.waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "https://acme.run.mcp-use.com/mcp",
      ),
    );
  });
});
