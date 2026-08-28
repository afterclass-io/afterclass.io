import type { ReactNode } from "react";

import { OgImageContent } from "./OgImageContent";
import { OgImageHeader } from "./OgImageHeader";
import { OgImageTitle } from "./OgImageTitle";

export const OgImage = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      height: "100%",
      width: "100%",
      display: "flex",
      padding: "2.125rem 2.25rem",
      flexDirection: "column",
      alignItems: "center",
      gap: "1rem",
      fontFamily: "Inter, sans-serif",
      background: "#ECECEF",
    }}
  >
    {children}
  </div>
);

OgImage.Header = OgImageHeader;
OgImage.Title = OgImageTitle;
OgImage.Content = OgImageContent;
