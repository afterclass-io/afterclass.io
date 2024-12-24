"use client";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import PhMoon from "~icons/ph/moon";
import PhSun from "~icons/ph/sun";

import { APP_THEMES } from "@/common/tools/tailwind/themes/appTheme";
import { Button } from "@/common/components/Button";

export const ThemeToggle = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleToggleTheme = useCallback(() => {
    if (theme === APP_THEMES.light) setTheme(APP_THEMES.dark);
    if (theme === APP_THEMES.dark) setTheme(APP_THEMES.light);
  }, [setTheme, theme]);

  return isMounted ? (
    <Button
      onClick={handleToggleTheme}
      aria-label="theme-toggle"
      variant="tertiary"
      iconLeft={theme === APP_THEMES.dark ? <PhSun /> : <PhMoon />}
      disabled={!isMounted}
    />
  ) : (
    <Button aria-label="theme-toggle" variant="tertiary" loading disabled />
  );
};
