"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/common/components/button";
import { MoonIcon, SunIcon } from "@/common/components/icons";
import { Loader2 } from "lucide-react";

export const ThemeToggle = () => {
  // next-themes reads the theme from the DOM — render a placeholder until
  // hydration so the server HTML matches.
  const isMounted = useSyncExternalStore(
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- no external store to subscribe to; mount state never changes
    () => () => {},
    () => true,
    () => false,
  );
  const { theme, systemTheme, setTheme } = useTheme();

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
