import { notFound } from "next/navigation";

import { env } from "@/env";

import { darkThemeConfig } from "@/common/tools/tailwind/themes/darkTheme";
import { lightThemeConfig } from "@/common/tools/tailwind/themes/lightTheme";
import { flattenObject } from "@/common/tools/tailwind/functions/flattenObject";

type ColorEntry = [string, string];
type ThemeColors = ColorEntry[];
type ThemesMap = {
  [key: string]: ThemeColors;
};

export default function ThemesPage() {
  if (env.NODE_ENV !== "development") notFound();

  const rawThemes = {
    light: lightThemeConfig(),
    dark: darkThemeConfig(),
  };

  const themes: ThemesMap = Object.entries(rawThemes).reduce(
    (acc: ThemesMap, [themeName, themeConfig]) => {
      const colors = Object.entries(
        flattenObject(themeConfig.colors, { convertHexToRgb: false }),
      );
      acc[themeName] = colors;
      return acc;
    },
    {},
  );

  return (
    <section className="flex flex-col gap-12 p-12">
      {Object.entries(themes).map(([themeName, colors]) => (
        <div key={themeName} className="space-y-6">
          <h2 className="text-xl font-semibold capitalize">
            {themeName} Theme
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {colors.map(([colorName, colorValue]) => (
              <div
                className="flex items-center gap-3 rounded-lg border border-border-default p-3"
                key={colorName}
              >
                <div
                  style={{ backgroundColor: colorValue }}
                  className="h-12 w-12 flex-shrink-0 rounded shadow-sm"
                />
                <div className="min-w-0">
                  <div className="truncate font-medium">{colorName}</div>
                  <div className="truncate text-sm text-text-em-low">
                    {colorValue}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
