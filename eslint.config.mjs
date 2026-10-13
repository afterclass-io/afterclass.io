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
  {
    files: ["src/**/*.{ts,tsx}", "views/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='toLocaleDateString']",
          message: "Use formatDateSGT from @/common/functions/format-date-sgt.",
        },
        {
          selector: "CallExpression[callee.property.name='toLocaleTimeString']",
          message: "Use formatTimeSGT from @/common/functions/format-date-sgt.",
        },
        {
          selector:
            "NewExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
          message:
            "Use the shared SGT helpers in @/common/functions/format-date-sgt.",
        },
        {
          selector: "Literal[value=/text-\\[\\d+px\\]/]",
          message:
            "Use a type-scale class (text-xs, or text-2xs for dense cells) instead of an arbitrary pixel size.",
        },
        {
          selector: "TemplateElement[value.raw=/text-\\[\\d+px\\]/]",
          message:
            "Use a type-scale class (text-xs, or text-2xs for dense cells) instead of an arbitrary pixel size.",
        },
      ],
    },
  },
  {
    files: [
      "src/common/functions/format-date-sgt.ts",
      "**/*.test.{ts,tsx}",
      "**/*.stories.{ts,tsx}",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
];

export default config;
