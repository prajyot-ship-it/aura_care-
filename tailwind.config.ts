import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        phenomenon: {
          canvas: "#F8F7F4",
          dignityCanvas: "#FAF8F5",
          surface: "#FFFFFF",
          hairline: "#E2DDD5",
          border: "#E5E7EB",
          ink: "#111827",
          muted: "#4B5563",
          sage: "#0F766E",
          emerald: "#10B981",
          amber: "#D97706",
          cobalt: "#2563EB",
        },
        dignity: {
          bg: "#FAF8F5",
          ink: "#111827",
          card: "#FFFFFF",
          border: "#E2DDD5",
          emerald: "#0F766E",
          amber: "#D97706",
          calmBlue: "#2563EB",
        },
      },
      boxShadow: {
        bento: "0 8px 30px rgba(17, 24, 39, 0.04)",
        "bento-hover": "0 16px 40px rgba(17, 24, 39, 0.08)",
        dock: "0 20px 50px rgba(17, 24, 39, 0.14)",
      },
      transitionTimingFunction: {
        phenomenon: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
