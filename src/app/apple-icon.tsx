import { generateAppIcon } from "./icon-shared";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return generateAppIcon(size.width, size.height, 120);
}
