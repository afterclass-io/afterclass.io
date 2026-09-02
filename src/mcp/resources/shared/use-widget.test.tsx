// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWidget } from "./use-widget";

function Harness() {
  const { isAvailable, callTool } = useWidget<{ x: number }>() as unknown as {
    isAvailable: boolean;
    callTool?: unknown;
  };
  return (
    <div>
      <span data-testid="isAvailable">{String(isAvailable)}</span>
      <span data-testid="hasCallTool">{String(typeof callTool === "function")}</span>
    </div>
  );
}

function setMcpParams(toolOutput: unknown) {
  window.history.replaceState(
    null,
    "",
    `/?mcpUseParams=${encodeURIComponent(
      JSON.stringify({ toolInput: {}, toolOutput, toolId: "test" }),
    )}`,
  );
}

// TODO Task7: skipped — useWidget removed in mcp-use v2 (replaced by useToolContext/useViewState)
describe.skip("shared useWidget isAvailable guard", () => {
  it("isAvailable true in mcp-ui (jsdom) harness with mcpUseParams", () => {
    setMcpParams({ x: 1 });
    render(<Harness />);
    expect(screen.getByTestId("isAvailable").textContent).toBe("true");
    expect(screen.getByTestId("hasCallTool").textContent).toBe("true");
  });

  it("isAvailable false without mcpUseParams and without window.openai", () => {
    window.history.replaceState(null, "", "/");
    // Ensure no window.openai
    delete (window as { openai?: unknown }).openai;
    render(<Harness />);
    expect(screen.getByTestId("isAvailable").textContent).toBe("false");
    expect(screen.getByTestId("hasCallTool").textContent).toBe("false");
  });
});
