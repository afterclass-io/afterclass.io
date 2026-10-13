// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { LoginForm } from "./LoginForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

const dataTestValues = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-test]"), (el) =>
    el.getAttribute("data-test"),
  ).sort();

const attributeByTestId = (elements: Element[], attribute: string) =>
  Object.fromEntries(
    elements.map((el): [string, string | null] => [
      el.getAttribute("data-test") ?? "",
      el.getAttribute(attribute),
    ]),
  );

describe("LoginForm markup contract", () => {
  describe("with enablePasswordLogin", () => {
    it("exposes exactly these data-test hooks", () => {
      const { container } = render(<LoginForm enablePasswordLogin={true} />);
      expect(dataTestValues(container)).toEqual([
        "email",
        "forget",
        "password",
        "register",
        "submit",
      ]);
    });

    it("sets tabindex on the fields, links and submit button", () => {
      const { container } = render(<LoginForm enablePasswordLogin={true} />);
      expect(
        attributeByTestId(
          Array.from(container.querySelectorAll("[data-test][tabindex]")),
          "tabindex",
        ),
      ).toEqual({
        email: "1",
        password: "2",
        submit: "3",
        forget: "5",
        register: "6",
      });
    });

    it("renders field labels in DOM order", () => {
      const { container } = render(<LoginForm enablePasswordLogin={true} />);
      expect(
        Array.from(container.querySelectorAll("label"), (el) => el.textContent),
      ).toEqual(["School Email Address", "PasswordForgot password?"]);
    });

    it("sets placeholders on the inputs", () => {
      const { container } = render(<LoginForm enablePasswordLogin={true} />);
      expect(
        attributeByTestId(
          Array.from(container.querySelectorAll("input")),
          "placeholder",
        ),
      ).toEqual({
        email: "john.doe.2023@smu.edu.sg",
        password: "Enter password",
      });
    });

    it("shows Login as the idle submit button text", () => {
      const { container } = render(<LoginForm enablePasswordLogin={true} />);
      expect(container.querySelector('[data-test="submit"]')?.textContent).toBe(
        "Login",
      );
    });
  });

  describe("without enablePasswordLogin", () => {
    it("exposes no data-test hooks", () => {
      const { container } = render(<LoginForm enablePasswordLogin={false} />);
      expect(dataTestValues(container)).toEqual([]);
    });

    it("renders no field labels and no placeholders", () => {
      const { container } = render(<LoginForm enablePasswordLogin={false} />);
      expect(container.querySelectorAll("label")).toHaveLength(0);
      expect(container.querySelectorAll("input")).toHaveLength(0);
    });
  });
});
