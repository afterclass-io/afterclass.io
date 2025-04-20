import "@/common/styles/globals.scss";

import type { Metadata, Viewport } from "next";

import { TRPCReactProvider } from "@/common/tools/trpc/react";
import { CoreLayout } from "@/common/components/core-layout";
import ThemeProvider from "@/common/providers/ThemeProvider";
import AuthProvider from "@/common/providers/AuthProvider";
import TooltipProvider from "@/common/providers/TooltipProvider";
import { inter, poppins } from "@/common/fonts";
import { env } from "@/env";
import { EdgeConfigProvider } from "@/common/providers/EdgeConfig";
import { UmamiProvider } from "@/common/providers/Umami";
import JotaiProvider from "@/common/providers/JotaiProvider";
import ProgressProvider from "@/common/providers/ProgressProvider";
import { GlobalProgressBar } from "@/modules/home/components/GlobalProgressBar";
import { Toaster } from "@/common/components/sonner";
import { UmamiIdentityTracker } from "@/modules/home/components/UmamiIdentityTracker";

const appName = "AfterClass";
const appDesc = [
  "Read 12,000+ reviews of courses and professors.",
  "Buy/sell course material. Personalized internship matching.",
  "Break classroom barriers. - Our one-stop-shop connection community.",
].join(" ");

export const viewport: Viewport = {
  themeColor: [
    // see `src\common\tools\tailwind\themes`
    { media: "(prefers-color-scheme: light)", color: "#F1F1F3" },
    { media: "(prefers-color-scheme: dark)", color: "#131316" },
  ],
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : env.NEXTAUTH_URL,
  ),
  title: appName,
  description: appDesc,
  openGraph: {
    title: appName,
    siteName: appName,
    description: appDesc,
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <head>
        <UmamiProvider
          src="/statistics/script.js"
          websiteId="b4f3137b-00dd-489c-9c68-8586950ab450"
          domains={["afterclass.io", "www.afterclass.io", "new.afterclass.io"]}
        />
      </head>
      <body>
        <AuthProvider>
          <TRPCReactProvider>
            <TooltipProvider>
              <ProgressProvider>
                <EdgeConfigProvider>
                  <JotaiProvider>
                    <ThemeProvider>
                      <GlobalProgressBar />
                      <CoreLayout>{children}</CoreLayout>
                      <Toaster />
                      <UmamiIdentityTracker />
                    </ThemeProvider>
                  </JotaiProvider>
                </EdgeConfigProvider>
              </ProgressProvider>
            </TooltipProvider>
          </TRPCReactProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
