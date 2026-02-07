import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./App.tsx",
    "./*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        ring: "hsl(var(--ring))"
      },
      boxShadow: {
        glow: "0 0 30px rgba(94, 234, 212, 0.35)",
        neon: "0 0 40px rgba(56, 189, 248, 0.35)",
        soft: "0 12px 30px rgba(15, 23, 42, 0.4)",
        insetSoft: "inset 0 1px 2px rgba(255, 255, 255, 0.15), inset 0 -8px 20px rgba(15, 23, 42, 0.45)"
      },
      backdropBlur: {
        xl: "24px"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
