"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/common/components/Button";
import { MoonIcon, SunIcon } from "@/common/components/CustomIcon";

export const ThemeToggle = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { theme, systemTheme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentTheme = theme === "system" ? systemTheme : theme;
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  return isMounted ? (
    <Button
      onClick={() => setTheme(newTheme)}
      aria-label="theme-toggle"
      variant="tertiary"
      iconLeft={currentTheme === "dark" ? <SunIcon /> : <MoonIcon />}
    />
  ) : (
    <Button aria-label="theme-toggle" variant="tertiary" loading disabled />
  );
};
