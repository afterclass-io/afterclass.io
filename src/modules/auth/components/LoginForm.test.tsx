// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { LoginForm } from "./LoginForm";

const mockSearchParams = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => mockSearchParams.current,
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

beforeEach(() => {
  mockSearchParams.current = new URLSearchParams();
  vi.clearAllMocks();
});

describe("LoginForm with enablePasswordLogin flag", () => {
  it("renders only Google sign-in when enablePasswordLogin is false", () => {
    const { container } = render(<LoginForm enablePasswordLogin={false} />);
    expect(screen.getByText(/sign in with google/i)).toBeDefined();
    expect(container.querySelector('[data-test="email"]')).toBeNull();
    expect(container.querySelector('[data-test="password"]')).toBeNull();
    expect(container.querySelector('[data-test="submit"]')).toBeNull();
    expect(screen.queryByText(/^OR$/)).toBeNull();
    expect(container.querySelector('[data-test="register"]')).toBeNull();
    expect(screen.queryByText(/don't have an account\?/i)).toBeNull();
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
    expect(screen.queryByText(/don't have an account\?/i)).toBeNull();
  });

  it("renders full password form when enablePasswordLogin is true", () => {
    const { container } = render(<LoginForm enablePasswordLogin={true} />);
    expect(screen.getByText(/sign in with google/i)).toBeDefined();
    expect(container.querySelector('[data-test="email"]')).not.toBeNull();
    expect(container.querySelector('[data-test="password"]')).not.toBeNull();
    expect(container.querySelector('[data-test="submit"]')).not.toBeNull();
    expect(screen.getByText(/^OR$/)).toBeDefined();
    expect(container.querySelector('[data-test="register"]')).not.toBeNull();
    expect(screen.getByText(/don't have an account\?/i)).toBeDefined();
  });

  it("forwards full callbackUrl with authorization_id to Google signIn", async () => {
    mockSearchParams.current = new URLSearchParams({
      callbackUrl: "/oauth/consent?authorization_id=abc",
    });
    render(<LoginForm enablePasswordLogin={false} />);
    fireEvent.click(
      screen.getByRole("button", { name: /sign in with google/i }),
    );
    await waitFor(() =>
      expect(vi.mocked(signIn)).toHaveBeenCalledWith("google", {
        callbackUrl: "/oauth/consent?authorization_id=abc",
      }),
    );
  });
});
