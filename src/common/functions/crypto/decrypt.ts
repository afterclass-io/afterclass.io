import crypto from "crypto";

import { getKey } from "./getKey";
import {
  ALGORITHM,
  SALT_LENGTH,
  TAG_POSITION,
  ENC_POSITION,
} from "@/common/constants/crypto";

export function decrypt(value: unknown, secret: string) {
  const str = Buffer.from(String(value), "base64");
  const salt = str.subarray(0, SALT_LENGTH);
  const iv = str.subarray(SALT_LENGTH, TAG_POSITION);
  const tag = str.subarray(TAG_POSITION, ENC_POSITION);
  const encrypted = str.subarray(ENC_POSITION);

  const key = getKey(secret, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(tag);

  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
