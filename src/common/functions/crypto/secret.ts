import { hash } from "./hash";
import { getAuthSecret } from "@/server/auth/auth-secret";

/**
 * Hash of the app secret, used as salt material. Throws when no secret is
 * set: the database URL holds credentials and must never stand in for it.
 */
export function secret() {
  const appSecret = getAuthSecret();
  if (!appSecret) {
    throw new Error("NEXTAUTH_SECRET is required to derive the salt secret");
  }
  return hash(appSecret);
}
