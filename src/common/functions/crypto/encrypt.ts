import crypto from "crypto";

import { getKey } from "./getKey";
import { ALGORITHM, SALT_LENGTH, IV_LENGTH } from "@/common/constants/crypto";

export function encrypt(value: unknown, secret: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(secret, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
}
