import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";
import "../src/common/styles/globals.scss";
import { inter, poppins } from "../src/common/fonts";
import AuthProvider from "../src/common/providers/AuthProvider";
import { TRPCReactProvider } from "../src/common/tools/trpc/react";
import TooltipProvider from "../src/common/providers/TooltipProvider";
import ProgressProvider from "../src/common/providers/ProgressProvider";
import { Toaster } from "../src/common/components/sonner";
import { SessionContext } from "next-auth/react";
import { mockAuthStates } from "./auth";

const preview: Preview = {
  parameters: {
    // actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
    options: {
      storySort: {
        method: "alphabetical",
      },
    },
  },
  decorators: [
    (Story, { parameters }) => {
      let mockSession = mockAuthStates.user.session;
      if (parameters?.mockSession) {
        mockSession = parameters.mockSession;
      }

      return (
        <AuthProvider>
          {/* @ts-ignore */}
          <SessionContext.Provider value={mockSession}>
            <TRPCReactProvider>
              <TooltipProvider>
                <ProgressProvider>
                  {/* @ts-ignore */}
                  <style global jsx>{`
                    :root {
                      --font-inter: ${inter.style.fontFamily};
                      --font-poppins: ${poppins.style.fontFamily};
                    }
                  `}</style>
                  <div
                    style={{
                      padding: "3rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    className={`bg-bg-base`}
                  >
                    <Story />
                    <Toaster />
                  </div>
                </ProgressProvider>
              </TooltipProvider>
            </TRPCReactProvider>
          </SessionContext.Provider>
        </AuthProvider>
      );
    },
    withThemeByClassName({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
  ],
};

export default preview;
