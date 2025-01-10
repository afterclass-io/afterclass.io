import { hash } from "./hash";
import { env } from "@/env";

export function secret() {
  return hash(env.NEXTAUTH_SECRET ?? env.DATABASE_URL);
}
