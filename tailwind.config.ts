// Note: cannot use alias like "@/" here

import tailwindCssAnimatePlugin from "tailwindcss-animate";
import defaultTheme from "tailwindcss/defaultTheme";

import { type Config } from "tailwindcss";
import { withTV } from "tailwind-variants/transformer";

// withTv is required for tailwind-variants resposnive variants to work
export default withTV({
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1040px",
      xl: "1270px",
      "2xl": "1536px",
    },
    extend: {
      zIndex: {
        elevated: "1",
        header: "10",
        "header-sidebar": "11",
        modal: "50",
        select: "51",
        dropdown: "51",
        popover: "52",
        tooltip: "53",
      },
      // Exported from Figma
      boxShadow: {
        sm: "0px 2px 4px 0px rgba(0,0,0,0.08), 0px 0px 6px 0px rgba(0,0,0,0.02)",
        md: "0px 4px 8px 0px rgba(0,0,0,0.06), 0px 0px 4px 0px rgba(0,0,0,0.04)",
        lg: "0px 8px 16px 0px rgba(0,0,0,0.08), 0px 0px 4px 0px rgba(0,0,0,0.04)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", ...defaultTheme.fontFamily.sans],
        display: [
          "var(--font-poppins)",
          "Poppins",
          ...defaultTheme.fontFamily.sans,
        ],
      },
      // Exported from Figma
      borderRadius: {
        none: "0",
        xs: "0.25rem",
        sm: "0.3125rem",
        default: "0.5rem",
        lg: "0.5625rem",
        xl: "0.625rem",
        "2xl": "0.6802384257316589rem",
        "3xl": "0.75rem",
        "4xl": "0.9375rem",
        "5xl": "1rem",
        "6xl": "1.125rem",
        "7xl": "1.1545162200927734rem",
        "8xl": "1.25rem",
        "9xl": "1.5625rem",
        "10xl": "1.8125rem",
        "11xl": "1.8451225757598877rem",
        "12xl": "2.1891283988952637rem",
        "13xl": "2.408041477203369rem",
        "14xl": "3rem",
        "15xl": "3.0625rem",
        "16xl": "3.3125rem",
        "17xl": "3.375rem",
        "18xl": "3.5625rem",
        "19xl": "3.6875rem",
        "20xl": "4.4375rem",
      },
    },
  },
  plugins: [tailwindCssAnimatePlugin],
}) satisfies Config;
