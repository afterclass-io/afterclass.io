import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import storybook from "eslint-plugin-storybook";

// These plugins' flat-config types don't line up with this ESLint version's
// Linter.Config generics; the configs themselves work fine at runtime.
/** @type {any} */
const tseslintRecommendedTypeChecked =
  tseslintPlugin.configs["flat/recommended-type-checked"];
/** @type {any} */
const tseslintStylisticTypeChecked =
  tseslintPlugin.configs["flat/stylistic-type-checked"];
/** @type {any} */
const storybookRecommended = storybook.configs["flat/recommended"];

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      "node_modules",
      ".next",
      ".mcp-use",
      ".superpowers",
      "storybook-static",
      "src/generated",
      "cypress/**/*.cy.js",
      "cypress/**/*.cy.ts",
    ],
  },
  // eslint-config-next bundles its own @typescript-eslint copy whose plugin
  // object identity differs from our direct dep — flat-config merge rejects
  // the duplicate "@typescript-eslint" key ("Cannot redefine plugin"). Swap
  // in our single instance; rule payloads are version-aligned (8.70).
  ...nextCoreWebVitals.map((entry) =>
    entry?.plugins?.["@typescript-eslint"]
      ? {
          ...entry,
          plugins: { ...entry.plugins, "@typescript-eslint": tseslintPlugin },
        }
      : entry,
  ),
  ...tseslintRecommendedTypeChecked,
  ...tseslintStylisticTypeChecked,
  ...storybookRecommended,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
    },
  },
  {
    files: ["eslint.config.mjs"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
];

export default config;
