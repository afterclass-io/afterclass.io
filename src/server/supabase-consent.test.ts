import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// Mock the installed `@supabase/supabase-js` (v2.112.0). Method names follow the
// real `auth.oauth.*` API: `listGrants()` and `revokeGrant({ clientId })` (not the
// older `getUserGrants()` / `revokeGrant(clientId)` shapes).
const {
  approveAuthorization,
  denyAuthorization,
  getAuthorizationDetails,
  listGrants,
  revokeGrant,
  setSession,
} = vi.hoisted(() => ({
  approveAuthorization: vi.fn() as Mock,
  denyAuthorization: vi.fn() as Mock,
  getAuthorizationDetails: vi.fn() as Mock,
  listGrants: vi.fn() as Mock,
  revokeGrant: vi.fn() as Mock,
  setSession: vi.fn(async () => ({ error: null })) as Mock,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      setSession,
      oauth: {
        approveAuthorization,
        denyAuthorization,
        getAuthorizationDetails,
        listGrants,
        revokeGrant,
      },
    },
  }),
}));

import {
  approveConsent,
  denyConsent,
  getConsentDetails,
  listUserGrants,
  revokeUserGrant,
} from "./supabase-consent";

describe("supabase-consent", () => {
  it("approves and returns the redirect url", async () => {
    approveAuthorization.mockResolvedValue({
      data: { redirect_url: "https://client/cb?code=x" },
      error: null,
    });
    await expect(approveConsent("auth-1", "tok")).resolves.toEqual({
      redirectUrl: "https://client/cb?code=x",
    });
    expect(approveAuthorization).toHaveBeenCalledWith("auth-1");
  });

  it("throws when approve fails", async () => {
    approveAuthorization.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(approveConsent("auth-1", "tok")).rejects.toThrow("nope");
  });

  it("denies and returns the redirect url", async () => {
    denyAuthorization.mockResolvedValue({
      data: { redirect_url: "https://client/cb?error=access_denied" },
      error: null,
    });
    await expect(denyConsent("auth-1", "tok")).resolves.toEqual({
      redirectUrl: "https://client/cb?error=access_denied",
    });
    expect(denyAuthorization).toHaveBeenCalledWith("auth-1");
  });

  it("throws when deny fails", async () => {
    denyAuthorization.mockResolvedValue({ data: null, error: { message: "denied badly" } });
    await expect(denyConsent("auth-1", "tok")).rejects.toThrow("denied badly");
  });

  it("lists user grants", async () => {
    listGrants.mockResolvedValue({
      data: [{ client: { id: "c1", name: "Client One" }, scopes: ["email"] }],
      error: null,
    });
    await expect(listUserGrants("tok")).resolves.toEqual([
      { id: "c1", client_id: "c1", client_name: "Client One", scopes: ["email"] },
    ]);
    expect(listGrants).toHaveBeenCalledWith();
  });

  it("throws when listing grants fails", async () => {
    listGrants.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(listUserGrants("tok")).rejects.toThrow("boom");
  });

  it("revokes a user grant", async () => {
    revokeGrant.mockResolvedValue({ error: null });
    await expect(revokeUserGrant("c1", "tok")).resolves.toBeUndefined();
    expect(revokeGrant).toHaveBeenCalledWith({ clientId: "c1" });
  });

  it("throws when revoking a grant fails", async () => {
    revokeGrant.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(revokeUserGrant("c1", "tok")).rejects.toThrow("nope");
  });

  it("returns consent details for an authorization", async () => {
    getAuthorizationDetails.mockResolvedValue({
      data: {
        authorization_id: "auth-1",
        client: { name: "Agent" },
        scope: "email profile",
        redirect_uri: "https://client/cb",
      },
      error: null,
    });
    await expect(getConsentDetails("auth-1", "tok")).resolves.toEqual({
      status: "details",
      client: { name: "Agent" },
      scope: "email profile",
      redirect_uri: "https://client/cb",
    });
    expect(getAuthorizationDetails).toHaveBeenCalledWith("auth-1");
  });

  it("returns an already-consented redirect result", async () => {
    getAuthorizationDetails.mockResolvedValue({
      data: { redirect_url: "https://client/cb?code=existing" },
      error: null,
    });
    await expect(getConsentDetails("auth-1", "tok")).resolves.toEqual({
      status: "already_consented",
      redirectUrl: "https://client/cb?code=existing",
    });
  });

  it("throws when fetching consent details fails", async () => {
    getAuthorizationDetails.mockResolvedValue({ data: null, error: { message: "bad auth" } });
    await expect(getConsentDetails("auth-1", "tok")).rejects.toThrow("bad auth");
  });
});
