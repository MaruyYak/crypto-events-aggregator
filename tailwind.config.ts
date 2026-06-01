import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#f7f8fb", dark: "#0b0d12" },
        panel: { DEFAULT: "#ffffff", dark: "#13161d" },
        panel2: { DEFAULT: "#f0f2f7", dark: "#191d26" },
        border: { DEFAULT: "#e1e4eb", dark: "#262b36" },
        accent: "#f7a01c",
        accent2: "#7c5cff",
        muted: { DEFAULT: "#6b7280", dark: "#8b94a7" },
        fg: { DEFAULT: "#1a1d24", dark: "#e7ecf3" },
      },
    },
  },
  plugins: [],
};

export default config;
