// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

const hrefOf = (label: string) =>
  screen.getByText(label).closest("a")?.getAttribute("href") ?? null;

describe("Markdown links", () => {
  it("keeps absolute http(s) and mailto links clickable", () => {
    render(
      <Markdown text="[a](https://afterclass.io/x) [b](http://localhost:3000/y) [c](mailto:hi@afterclass.io)" />,
    );
    expect(hrefOf("a")).toBe("https://afterclass.io/x");
    expect(hrefOf("b")).toBe("http://localhost:3000/y");
    expect(hrefOf("c")).toBe("mailto:hi@afterclass.io");
  });

  it("keeps site-relative paths clickable", () => {
    render(<Markdown text="[Open poll](/meetings/xK9mP2vL7q)" />);
    expect(hrefOf("Open poll")).toBe("/meetings/xK9mP2vL7q");
  });

  it("drops unsafe and off-site-ambiguous hrefs", () => {
    render(
      <Markdown text="[js](javascript:alert(1)) [proto](//evil.example/x) [back](/\evil.example) [bare](meetings/x)" />,
    );
    expect(hrefOf("js")).toBeNull();
    expect(hrefOf("proto")).toBeNull();
    expect(hrefOf("bare")).toBeNull();
  });

  it("never lets a backslash path become an off-site link", () => {
    render(<Markdown text="[back](/\evil.example)" />);
    // react-markdown percent-encodes the backslash, so it stays a site path.
    expect(hrefOf("back")).toBe("/%5Cevil.example");
  });

  it("opens links in a new tab without leaking the opener", () => {
    render(<Markdown text="[Open poll](/meetings/xK9mP2vL7q)" />);
    const a = screen.getByText("Open poll").closest("a");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer nofollow");
  });
});
