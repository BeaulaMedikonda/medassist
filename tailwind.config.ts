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
        // Mantine-style dark surfaces. Custom because Tailwind's slate doesn't
        // hit the same warm-charcoal feel.
        ink: {
          50: "#f8f9fa",
          100: "#f1f3f5",
          200: "#e9ecef",
          300: "#dee2e6",
          400: "#ced4da",
          500: "#adb5bd",
          600: "#868e96",
          700: "#495057",
          800: "#343a40",
          900: "#212529",
          950: "#1a1b1e", // Mantine dark.7 — body bg
          975: "#141517", // even deeper, for behind-elevated areas
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        deva: ["Noto Sans Devanagari", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 3px rgba(15, 23, 42, 0.04)",
        card: "0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)",
        elevated:
          "0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)",
        deep: "0 10px 25px -5px rgba(15, 23, 42, 0.10), 0 8px 10px -6px rgba(15, 23, 42, 0.06)",
        ring: "0 0 0 3px rgba(34, 139, 230, 0.18)",
        // Glow used on hover/focus for primary CTAs
        glow: "0 0 0 1px rgba(34, 139, 230, 0.20), 0 8px 16px -4px rgba(34, 139, 230, 0.18)",
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
