import { startOfMonth } from "date-fns";
import { hash } from "./hash";
import { secret } from "./secret";

/**
 * Rotating salt based on the start of the month.
 * Within the month, the salt will be the same
 */
export function rotatingSaltStartOfMonth() {
  const ROTATING_SALT = hash(startOfMonth(new Date()).toUTCString());

  return hash(secret(), ROTATING_SALT);
}
