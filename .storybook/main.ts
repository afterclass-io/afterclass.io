import { createRequire } from "node:module";
import type { StorybookConfig } from "@storybook/nextjs";

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-themes"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: [
    {
      from: "../public",
      to: "public",
    },
  ],
  webpackFinal: async (webpackConfig) => {
    // `obscenity`'s ESM entry (dist/index.mjs) is a gen-esm-wrapper shim that
    // re-exports its CJS build via a default import. In the Storybook preview
    // bundle that interop breaks at runtime — `mod` is undefined, so
    // evaluating `mod.DataSet` throws "Cannot read properties of undefined
    // (reading 'DataSet')" and Chromatic fails to extract stories. Force the
    // CJS build (its `require` exports condition) to skip the broken shim.
    webpackConfig.resolve ??= {};
    webpackConfig.resolve.alias = {
      // oxlint-disable-next-line typescript/no-misused-spread -- webpack resolve.alias is the object form here
      ...webpackConfig.resolve.alias,
      obscenity$: require.resolve("obscenity"),
    };
    return webpackConfig;
  },
};
export default config;
