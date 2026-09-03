// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";

import { HomeBreadcrumb } from "./Breadcrumb";

const mockPathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.current,
  useSearchParams: () => new URLSearchParams(),
}));

describe("HomeBreadcrumb server-rendered crumb", () => {
  afterEach(() => {
    cleanup();
    mockPathname.current = "/";
  });

  // No QueryClientProvider/TRPCReactProvider wrapper on purpose: if the crumb
  // ever regresses to a client query, useQuery throws and this test fails.
  it("renders the course crumb from the route segment with no client query", () => {
    mockPathname.current = "/course/CS101";
    render(<HomeBreadcrumb />);
    expect(screen.getByText("CS101")).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
  });

  it("renders the professor crumb from the route segment with no client query", () => {
    mockPathname.current = "/professor/rand-hirmiz";
    render(<HomeBreadcrumb />);
    expect(screen.getByText("Prof. rand-hirmiz")).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
  });

  it("derives the crumb from route segments only - no getByCourseCode/getBySlug query", () => {
    const src = fs.readFileSync(
      path.resolve(import.meta.dirname, "./Breadcrumb.tsx"),
      "utf-8",
    );
    expect(src).not.toContain("api.courses.");
    expect(src).not.toContain("api.professors.");
  });
});
