import { v4, v5 } from "uuid";
import { hash } from "./hash";
import { rotatingSaltStartOfMonth } from "./rotatingSaltStartOfMonth";

export function uuid(...args: string[]) {
  if (!args.length) return v4();

  return v5(hash(...args, rotatingSaltStartOfMonth()), v5.DNS);
}
