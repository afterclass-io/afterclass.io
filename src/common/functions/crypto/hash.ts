import crypto from "crypto";

import { HASH_ALGO, HASH_ENCODING } from "@/common/constants/crypto";

export function hash(...args: string[]) {
  return crypto
    .createHash(HASH_ALGO)
    .update(args.join(""))
    .digest(HASH_ENCODING);
}
