import type { MetadataRoute } from "next";

const appName = "AfterClass";
const appDesc = [
  "Read 12,000+ reviews of courses and professors.",
  "Buy/sell course material. Personalized internship matching.",
  "Break classroom barriers. - Our one-stop-shop connection community.",
].join(" ");

/**
 * Generates the Web App Manifest for the site (served at /manifest.webmanifest).
 *
 * Provides PWA metadata allowing users to install AfterClass to their device
 * home screen with consistent branding and standalone display mode.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appName,
    description: appDesc,
    start_url: "/",
    display: "standalone",
    background_color: "#F1F1F3",
    theme_color: "#F1F1F3",
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
