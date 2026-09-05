import { createRequire } from "node:module";
import type { StorybookConfig } from "@storybook/nextjs";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const defaultEnv: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy-key",
  NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS: "smu.edu.sg",
  NEXT_PUBLIC_AC_CHANNEL_LINK: "https://t.me/example",
  NEXT_PUBLIC_AC_HELPDESK_LINK: "https://t.me/example",
  NEXT_PUBLIC_AC_GITHUB_LINK: "https://github.com/example",
};

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-themes"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  env: (config) => {
    const nextPublicEnvs = Object.fromEntries(
      Object.entries(process.env).filter(([key]) =>
        key.startsWith("NEXT_PUBLIC_"),
      ),
    ) as Record<string, string>;
    return {
      ...config,
      ...defaultEnv,
      ...nextPublicEnvs,
      ...(process.env.SKIP_ENV_VALIDATION
        ? { SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION }
        : {}),
    };
  },
  staticDirs: [
    {
      from: "../public",
      to: "public",
    },
  ],
  webpackFinal: async (config) => {
    // `obscenity`'s ESM entry (dist/index.mjs) is a gen-esm-wrapper shim that
    // re-exports its CJS build via a default import. In the Storybook preview
    // bundle that interop breaks at runtime — `mod` is undefined, so
    // evaluating `mod.DataSet` throws "Cannot read properties of undefined
    // (reading 'DataSet')" and Chromatic fails to extract stories. Force the
    // CJS build (its `require` exports condition) to skip the broken shim.
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      obscenity$: require.resolve("obscenity"),
    };
    return config;
  },
};
export default config;
