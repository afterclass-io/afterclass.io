import path from "path";
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)", "../views/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-themes"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  docs: {
    autodocs: true,
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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      obscenity$: require.resolve("obscenity"),
      // Storybook-only: point @ai-sdk/react at the mock that swaps useChat for
      // one driven by `parameters.chatState`. Vitest does not use webpack, so
      // the unit suite is unaffected.
      "@ai-sdk/react": path.resolve(__dirname, "./mocks/ai-sdk-react.ts"),
      // Storybook-only: point mcp-use/react at the mock that swaps the v2 View
      // hooks (useToolContext/useViewTheme/useHostContext/useDynamicTool) for
      // context-driven implementations seeded by the `withMcpView` decorator.
      // The real hooks require the module-private bootstrapView runtime that
      // only exists inside an MCP Apps host. Vitest mocks the module with
      // vi.mock instead, so the unit suite is unaffected.
      "mcp-use/react": path.resolve(__dirname, "./mocks/mcp-use-react.ts"),
    };
    return config;
  },
};
export default config;
