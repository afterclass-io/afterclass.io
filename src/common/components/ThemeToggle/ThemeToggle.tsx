"use client";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { APP_THEMES } from "@/common/tools/tailwind/themes/appTheme";
import { Button } from "@/common/components/Button";
import { MoonIcon, SunIcon } from "@/common/components/CustomIcon";

export const ThemeToggle = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { theme, systemTheme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentTheme = theme === "system" ? systemTheme : theme;
  const newTheme =
    currentTheme === APP_THEMES.dark ? APP_THEMES.light : APP_THEMES.dark;

  return isMounted ? (
    <Button
      onClick={() => setTheme(newTheme)}
      aria-label="theme-toggle"
      variant="tertiary"
      iconLeft={currentTheme === APP_THEMES.dark ? <SunIcon /> : <MoonIcon />}
    />
  ) : (
    <Button aria-label="theme-toggle" variant="tertiary" loading disabled />
  );
};
