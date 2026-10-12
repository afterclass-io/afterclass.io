// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ForgotPwdForm } from "./ForgotPwdForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/common/tools/supabase/client", () => ({
  supabaseBrowser: {
    auth: {
      resetPasswordForEmail: vi.fn(),
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

vi.mock("../functions", () => ({
  getUserPlatform: vi.fn(),
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

describe("ForgotPwdForm markup contract", () => {
  it("renders exactly these data-test hooks", () => {
    const { container } = render(<ForgotPwdForm />);

    const dataTests = Array.from(container.querySelectorAll("[data-test]"))
      .map((el) => el.getAttribute("data-test"))
      .sort();

    expect(dataTests).toEqual(["email", "register", "submit"]);
  });

  it("sets tabindex on email, submit and register keyed by data-test", () => {
    const { container } = render(<ForgotPwdForm />);

    const tabIndexes = Array.from(container.querySelectorAll("[tabindex]")).map(
      (el) => ({
        dataTest: el.getAttribute("data-test"),
        tabindex: el.getAttribute("tabindex"),
      }),
    );

    expect(tabIndexes).toEqual([
      { dataTest: "email", tabindex: "1" },
      { dataTest: "submit", tabindex: "2" },
      { dataTest: "register", tabindex: "3" },
    ]);
  });

  it("renders the email field label", () => {
    const { container } = render(<ForgotPwdForm />);

    const labels = Array.from(container.querySelectorAll("label")).map(
      (el) => el.textContent,
    );

    expect(labels).toEqual(["School Email Address"]);
  });

  it("renders the email input placeholder", () => {
    const { container } = render(<ForgotPwdForm />);

    const emailInput = container.querySelector<HTMLInputElement>(
      '[data-test="email"]',
    );

    expect(emailInput?.getAttribute("placeholder")).toBe(
      "john.doe.2023@smu.edu.sg",
    );
  });

  it("renders the submit button idle text", () => {
    const { container } = render(<ForgotPwdForm />);

    const submitButton = container.querySelector<HTMLButtonElement>(
      '[data-test="submit"]',
    );

    expect(submitButton?.textContent).toBe("Reset my password");
  });
});
