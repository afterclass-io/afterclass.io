"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { APP_THEMES } from "@/common/tools/tailwind/themes/appTheme";

const NEXT_THEMES = Object.keys(APP_THEMES).map((key) => key);

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      themes={NEXT_THEMES}
    >
      {children}
    </NextThemeProvider>
  );
}
