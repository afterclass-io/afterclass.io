import { startOfHour } from "date-fns";
import { hash } from "./hash";
import { secret } from "./secret";

/**
 * Rotating salt based on the start of the hour.
 * Within the hour, the salt will be the same
 */
export function rotatingSaltStartOfHour() {
  const ROTATING_SALT = hash(startOfHour(new Date()).toUTCString());

  return hash(secret(), ROTATING_SALT);
}
