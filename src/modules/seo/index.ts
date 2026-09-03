import type { Metadata } from "next";

export * from "./components/json-ld";

export function buildEntityMetadata({
  title,
  description,
  canonicalPath,
}: {
  title: string;
  description: string;
  canonicalPath: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
