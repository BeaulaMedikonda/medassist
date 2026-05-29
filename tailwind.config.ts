import type { Config } from "tailwindcss";

// Palette inspired by Medplum (Mantine-based). Blue is the primary brand,
// teal is the secondary accent, slate is the neutral base.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e7f5ff",
          100: "#d0ebff",
          200: "#a5d8ff",
          300: "#74c0fc",
          400: "#4dabf7",
          500: "#339af0",
          600: "#228be6",
          700: "#1c7ed6",
          800: "#1971c2",
          900: "#1864ab",
        },
        accent: {
          50: "#e6fcf5",
          100: "#c3fae8",
          200: "#96f2d7",
          300: "#63e6be",
          400: "#38d9a9",
          500: "#20c997",
          600: "#12b886",
          700: "#0ca678",
          800: "#099268",
          900: "#087f5b",
        },
        // Deep navy dark surfaces — professional, medical-grade.
        // Light tones (text) kept neutral; dark tones shifted to navy for sidebar/cards.
        ink: {
          50: "#f8f9fa",
          100: "#f1f3f5",
          200: "#e9ecef",
          300: "#dee2e6",
          400: "#ced4da",
          500: "#adb5bd",
          600: "#868e96",
          700: "#495057",
          800: "#1e2d40",  // navy dark — borders in dark mode
          900: "#152235",  // deep navy — sidebar & card bg in dark mode
          950: "#0d1726",  // deeper navy — body bg in dark mode
          975: "#080f1a",  // deepest navy — below-card areas
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        deva: ["Noto Sans Devanagari", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        xs:       "0 1px 2px rgba(15, 23, 42, 0.04)",
        soft:     "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        card:     "0 1px 3px rgba(15, 23, 42, 0.06), 0 2px 8px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
        elevated: "0 4px 16px -2px rgba(15, 23, 42, 0.10), 0 2px 6px -1px rgba(15, 23, 42, 0.06)",
        deep:     "0 20px 40px -8px rgba(15, 23, 42, 0.14), 0 8px 20px -4px rgba(15, 23, 42, 0.08)",
        ring:     "0 0 0 3px rgba(34, 139, 230, 0.22)",
        glow:     "0 2px 10px rgba(34, 139, 230, 0.30), 0 0 0 1px rgba(34, 139, 230, 0.18)",
        "glow-sm":"0 1px 6px rgba(34, 139, 230, 0.22)",
        inner:    "inset 0 2px 4px rgba(15, 23, 42, 0.06)",
      },
      backgroundImage: {
        "hero-light":
          "radial-gradient(at 30% 0%, rgba(208, 235, 255, 0.55) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(195, 250, 232, 0.35) 0px, transparent 50%)",
        "hero-dark":
          "radial-gradient(at 30% 0%, rgba(28, 126, 214, 0.18) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(18, 184, 134, 0.12) 0px, transparent 50%)",
        "shimmer":
          "linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.04) 50%, transparent 70%)",
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(34, 139, 230, 0.55)" },
          "70%": { boxShadow: "0 0 0 18px rgba(34, 139, 230, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34, 139, 230, 0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        slideUp: "slideUp 0.3s ease-out",
        fadeIn: "fadeIn 0.2s ease-out",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
