import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn() as Mock,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

import * as mod from "./supabase";
import {
  createServerSupabaseClient,
  ResendType,
  resendEmail,
  serverSupabaseAuthOptions,
  signInWithEmail,
} from "./supabase";

describe("server supabase", () => {
  beforeEach(() => {
    createClientMock.mockReset();
  });

  it("exports serverSupabaseAuthOptions with three non-persisting flags", () => {
    expect(serverSupabaseAuthOptions).toEqual({
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  });

  it("does not export a shared supabase client", () => {
    expect("supabase" in mod).toBe(false);
  });

  it("createServerSupabaseClient calls createClient with url, anon key and serverSupabaseAuthOptions", () => {
    const dummyClient = { auth: {} };
    createClientMock.mockReturnValue(dummyClient);

    const client = createServerSupabaseClient();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      serverSupabaseAuthOptions,
    );
    expect(client).toBe(dummyClient);
  });

  it("signInWithEmail calls createClient once per call and calls signInWithPassword on that instance only", async () => {
    const signInWithPasswordMock = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    const dummyClient = {
      auth: {
        signInWithPassword: signInWithPasswordMock,
      },
    };
    createClientMock.mockReturnValue(dummyClient);

    const result = await signInWithEmail("student@smu.edu.sg", "password123");

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      serverSupabaseAuthOptions,
    );
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "student@smu.edu.sg",
      password: "password123",
    });
    expect(result).toEqual({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  it("creates two different client instances for parallel signInWithEmail calls and returns results to respective callers", async () => {
    const signInWithPassword1 = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const client1 = {
      auth: {
        signInWithPassword: signInWithPassword1,
      },
    };

    const signInWithPassword2 = vi.fn().mockResolvedValue({
      data: { user: { id: "user-2" } },
      error: null,
    });
    const client2 = {
      auth: {
        signInWithPassword: signInWithPassword2,
      },
    };

    createClientMock.mockReturnValueOnce(client1).mockReturnValueOnce(client2);

    const [res1, res2] = await Promise.all([
      signInWithEmail("u1@smu.edu.sg", "pass1"),
      signInWithEmail("u2@smu.edu.sg", "pass2"),
    ]);

    expect(createClientMock).toHaveBeenCalledTimes(2);
    expect(signInWithPassword1).toHaveBeenCalledWith({
      email: "u1@smu.edu.sg",
      password: "pass1",
    });
    expect(signInWithPassword2).toHaveBeenCalledWith({
      email: "u2@smu.edu.sg",
      password: "pass2",
    });
    expect(res1.data?.user?.id).toBe("user-1");
    expect(res2.data?.user?.id).toBe("user-2");
  });

  it("resendEmail builds its own client and calls resend on that instance", async () => {
    const resendMock = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    });
    const dummyClient = {
      auth: {
        resend: resendMock,
      },
    };
    createClientMock.mockReturnValue(dummyClient);

    const result = await resendEmail("student@smu.edu.sg", ResendType.SIGNUP);

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      serverSupabaseAuthOptions,
    );
    expect(resendMock).toHaveBeenCalledWith({
      type: ResendType.SIGNUP,
      email: "student@smu.edu.sg",
    });
    expect(result).toEqual({
      data: {},
      error: null,
    });
  });
});
