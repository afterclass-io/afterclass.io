"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/common/components/button";
import { MoonIcon, SunIcon } from "@/common/components/icons";
import { Loader2 } from "lucide-react";

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
      variant="outline"
      size="icon"
    >
      {currentTheme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  ) : (
    <Button aria-label="theme-toggle" variant="outline" disabled>
      <Loader2 className="animate-spin" size={16} />
    </Button>
  );
};
