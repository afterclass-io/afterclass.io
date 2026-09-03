import { generateAppIcon } from "./icon-shared";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return generateAppIcon(size.width, size.height, 22);
}
