import { describe, expect, it } from "vitest";
import { toolLabel, toolStatus, type ToolPart } from "./tool-part";

const dynamic = (state: string): ToolPart =>
  ({ type: "dynamic-tool", toolName: "search-courses", toolCallId: "t1", state }) as ToolPart;

describe("tool-part", () => {
  it("labels a dynamic tool by its toolName", () => {
    expect(toolLabel(dynamic("input-available"))).toBe("search-courses");
  });
  it("labels a typed tool by its name", () => {
    expect(toolLabel({ type: "tool-search-courses", toolCallId: "t1", state: "input-available", input: {} })).toBe("search-courses");
  });
  it("maps streaming states to running", () => {
    expect(toolStatus(dynamic("input-streaming"))).toBe("running");
    expect(toolStatus(dynamic("input-available"))).toBe("running");
    expect(toolStatus(dynamic("approval-requested"))).toBe("running");
  });
  it("maps output-error to error", () => {
    expect(toolStatus(dynamic("output-error"))).toBe("error");
  });
  it("maps output-available to done", () => {
    expect(toolStatus(dynamic("output-available"))).toBe("done");
  });
});
