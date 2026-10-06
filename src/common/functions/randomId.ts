import { customAlphabet } from "nanoid";

const nonAmbiguous = "cdefhjkmnprtvwxy2345689";
const nanoidDefault = customAlphabet(nonAmbiguous, 12);

export default function randomId(length: number = 12): string {
  if (length === 12) return nanoidDefault();
  return customAlphabet(nonAmbiguous, length)();
}
