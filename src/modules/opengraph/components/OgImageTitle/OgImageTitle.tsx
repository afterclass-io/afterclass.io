import type { ReactNode } from "react";

export const OgImageTitle = ({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) => (
  <div
    style={{
      display: "flex",
      width: "100%",
      gap: "1rem",
      alignItems: "center",
    }}
  >
    {icon}
    <div
      style={{
        width: "100%",
        paddingLeft: "0.25rem",
        fontFamily: "Inter, sans-serif",
        fontSize: "1.875rem",
        fontWeight: "600",
        fontStyle: "normal",
        lineHeight: "2.25rem",
        flex: "1 0 0",
        color: "#070708",
        // line-clamp-2
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 1,
        WebkitBoxOrient: "vertical",
        textOverflow: "ellipsis",
      }}
    >
      {children}
    </div>
  </div>
);
