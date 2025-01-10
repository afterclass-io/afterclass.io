import crypto from "crypto";

export function md5(...args: string[]) {
  return crypto.createHash("md5").update(args.join("")).digest("hex");
}
