import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AfterClass",
    short_name: "AfterClass",
    description:
      "Read 12,000+ reviews of courses and professors. Buy/sell course material. Personalized internship matching. Break classroom barriers. - Our one-stop-shop connection community.",
    start_url: "/",
    display: "standalone",
    background_color: "#131316",
    theme_color: "#131316",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
