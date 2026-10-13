// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { SignupForm } from "./SignupForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/common/tools/supabase/client", () => ({
  supabaseBrowser: {
    auth: {
      signUp: vi.fn(),
    },
  },
}));

vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
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

describe("SignupForm markup contract", () => {
  it("exposes exactly these data-test hooks", () => {
    const { container } = render(<SignupForm />);
    expect(dataTestValues(container)).toEqual([
      "confirm-password",
      "email",
      "password",
      "submit",
    ]);
  });

  it("sets tabindex on the fields and submit button", () => {
    const { container } = render(<SignupForm />);
    expect(
      attributeByTestId(
        Array.from(container.querySelectorAll("[data-test][tabindex]")),
        "tabindex",
      ),
    ).toEqual({
      email: "1",
      password: "2",
      "confirm-password": "3",
      submit: "4",
    });
  });

  it("renders field labels in DOM order", () => {
    const { container } = render(<SignupForm />);
    expect(
      Array.from(container.querySelectorAll("label"), (el) => el.textContent),
    ).toEqual(["School Email Address", "New Password", "Confirm Password"]);
  });

  it("sets placeholders on the inputs", () => {
    const { container } = render(<SignupForm />);
    expect(
      attributeByTestId(
        Array.from(container.querySelectorAll("input")),
        "placeholder",
      ),
    ).toEqual({
      email: "john.doe.2023@smu.edu.sg",
      password: "Enter password",
      "confirm-password": "Confirm password",
    });
  });

  it("shows Sign up as the idle submit button text", () => {
    const { container } = render(<SignupForm />);
    expect(container.querySelector('[data-test="submit"]')?.textContent).toBe(
      "Sign up",
    );
  });
});
