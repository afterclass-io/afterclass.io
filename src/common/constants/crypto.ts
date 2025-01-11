export const ALGORITHM = "aes-256-gcm";
export const IV_LENGTH = 16;
export const SALT_LENGTH = 64;
export const TAG_LENGTH = 16;
export const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
export const ENC_POSITION = TAG_POSITION + TAG_LENGTH;

export const HASH_ALGO = "sha512";
export const HASH_ENCODING = "hex";
