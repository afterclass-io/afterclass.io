// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn() as Mock,
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/common/tools/trpc/react", () => ({
  api: {
    professors: {
      getBySlug: { useQuery: () => ({ isSuccess: false, data: undefined }) },
    },
    courses: {
      getByCourseCode: { useQuery: () => ({ isSuccess: false, data: undefined }) },
    },
    roadmaps: { getById: { useQuery: () => ({ data: undefined }) } },
  },
}));

import { HomeBreadcrumb } from "./Breadcrumb";

describe("HomeBreadcrumb", () => {
  it("renders Home > MCP > Connected Agents on /mcp/connected-agents", () => {
    mockUsePathname.mockReturnValue("/mcp/connected-agents");
    render(<HomeBreadcrumb />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "MCP" })).toHaveAttribute(
      "href",
      "/mcp",
    );
    expect(screen.getByText("Connected Agents")).toBeInTheDocument();
  });

  it("renders Home > MCP on /mcp", () => {
    mockUsePathname.mockReturnValue("/mcp");
    render(<HomeBreadcrumb />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText("MCP")).toBeInTheDocument();
  });
});
