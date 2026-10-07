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
    meetings: {
      getPollBySlug: {
        useQuery: ({ slug }: { slug: string }) => {
          if (slug === "test-poll-slug") {
            return {
              isSuccess: true,
              data: { poll: { title: "CS101 Project Sync" } },
            };
          }
          return { isSuccess: false, data: undefined };
        },
      },
    },
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

  it("renders Home > Meetings on /meetings", () => {
    mockUsePathname.mockReturnValue("/meetings");
    render(<HomeBreadcrumb />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText("Meetings")).toBeInTheDocument();
  });

  it("renders Home > Meetings > New Meeting on /meetings/new", () => {
    mockUsePathname.mockReturnValue("/meetings/new");
    render(<HomeBreadcrumb />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Meetings" })).toHaveAttribute(
      "href",
      "/meetings",
    );
    expect(screen.getByText("New Meeting")).toBeInTheDocument();
  });

  it("renders Home > Meetings > {Poll Title} on /meetings/[slug]", () => {
    mockUsePathname.mockReturnValue("/meetings/test-poll-slug");
    render(<HomeBreadcrumb />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Meetings" })).toHaveAttribute(
      "href",
      "/meetings",
    );
    expect(screen.getByText("CS101 Project Sync")).toBeInTheDocument();
  });

  it("renders Home > Meetings > Meeting Details fallback when title not loaded", () => {
    mockUsePathname.mockReturnValue("/meetings/unknown-slug");
    render(<HomeBreadcrumb />);
    expect(screen.getByRole("link", { name: "Meetings" })).toHaveAttribute(
      "href",
      "/meetings",
    );
    expect(screen.getByText("Meeting Details")).toBeInTheDocument();
  });
});
