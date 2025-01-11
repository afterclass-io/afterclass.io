import crypto from "crypto";

export const getKey = (password: string, salt: Buffer) =>
  crypto.pbkdf2Sync(password, salt, 10000, 32, "sha512");
