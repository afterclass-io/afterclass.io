// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("LoginForm with enablePasswordLogin flag", () => {
  it("renders only Google sign-in when enablePasswordLogin is false", () => {
    const { container } = render(<LoginForm enablePasswordLogin={false} />);
    expect(screen.getByText(/sign in with google/i)).toBeDefined();
    expect(container.querySelector('[data-test="email"]')).toBeNull();
    expect(container.querySelector('[data-test="password"]')).toBeNull();
    expect(container.querySelector('[data-test="submit"]')).toBeNull();
    expect(screen.queryByText(/^OR$/)).toBeNull();
    expect(container.querySelector('[data-test="register"]')).toBeNull();
    expect(container.querySelector('[data-test="forget"]')).toBeNull();
  });

  it("hides password form by default (enablePasswordLogin omitted)", () => {
    const { container } = render(<LoginForm />);
    expect(screen.getByText(/sign in with google/i)).toBeDefined();
    expect(container.querySelector('[data-test="email"]')).toBeNull();
    expect(container.querySelector('[data-test="password"]')).toBeNull();
    expect(container.querySelector('[data-test="submit"]')).toBeNull();
    expect(screen.queryByText(/^OR$/)).toBeNull();
    expect(container.querySelector('[data-test="register"]')).toBeNull();
  });

  it("renders full password form when enablePasswordLogin is true", () => {
    const { container } = render(<LoginForm enablePasswordLogin={true} />);
    expect(screen.getByText(/sign in with google/i)).toBeDefined();
    expect(container.querySelector('[data-test="email"]')).not.toBeNull();
    expect(container.querySelector('[data-test="password"]')).not.toBeNull();
    expect(container.querySelector('[data-test="submit"]')).not.toBeNull();
    expect(screen.getByText(/^OR$/)).toBeDefined();
    expect(container.querySelector('[data-test="register"]')).not.toBeNull();
  });
});
