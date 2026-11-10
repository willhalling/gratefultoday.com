const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./layout/**/*.{js,ts,jsx,tsx,mdx}",
    "./**/*.{js,ts,tsx,css}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Grateful Today Brand Colors - aligned with /brand page
        // Primary brand color: Green (nature, growth, sobriety, peace)
        "brand-green": {
          50: "#f0fdf4", // bg-green-50 - light backgrounds
          100: "#dcfce7", // bg-green-100 - card backgrounds
          200: "#bbf7d0", // bg-green-200 - borders
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d", // text-green-700 - primary text
          800: "#166534",
          900: "#14532d",
        },
        // Amber: warm, welcoming, examples
        "brand-amber": {
          50: "#fffbeb", // bg-amber-50 - light backgrounds
          100: "#fef3c7", // bg-amber-100 - card backgrounds
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24", // border-amber-400 - borders
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309", // text-amber-700 - primary text
          800: "#92400e", // text-amber-800 - darker text
          900: "#78350f",
        },
        // Red: YouTube content
        "brand-red": {
          50: "#fef2f2", // bg-red-50 - light backgrounds
          100: "#fee2e2", // bg-red-100 - card backgrounds
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c", // text-red-700 - primary text
          800: "#991b1b",
          900: "#7f1d1d",
        },
        // Purple: Midjourney, creative content
        "brand-purple": {
          50: "#faf5ff", // bg-purple-50 - light backgrounds
          100: "#f3e8ff", // bg-purple-100 - card backgrounds
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce", // text-purple-700 - primary text
          800: "#6b21a8",
          900: "#581c87",
        },
        // Blue: Suno, music, audio content
        "brand-blue": {
          50: "#eff6ff", // bg-blue-50 - light backgrounds
          100: "#dbeafe", // bg-blue-100 - card backgrounds
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8", // text-blue-700 - primary text
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // Gray: text, backgrounds, UI elements
        "brand-gray": {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb", // border-gray-200 - borders
          300: "#d1d5db",
          400: "#9ca3af", // text-gray-400 - muted elements
          500: "#6b7280",
          600: "#4b5563", // text-gray-600 - secondary text
          700: "#374151",
          800: "#1f2937", // text-gray-800 - primary text
          900: "#111827",
        },
        // Semantic color system - UPDATE THESE TO CHANGE YOUR ENTIRE THEME
        // Refined warm natural palette
        primary: {
          DEFAULT: "#36574E",
          50: "#F5F3EE",
          100: "#E8E2D8",
          200: "#C8D2CC",
          300: "#9DB3A9",
          400: "#54766B",
          500: "#2E4A42",
          600: "#253C35",
          700: "#1E302B",
          800: "#182824",
          900: "#121F1C",
          light: "#E8E2D8",
          dark: "#222C2A",
          hover: "#2E4A42",
        },
        secondary: {
          DEFAULT: "#D5AE70",
          50: "#FBF7EF",
          100: "#F4E9D3",
          200: "#E9D2A7",
          300: "#DFC18A",
          400: "#D5AE70",
          500: "#C39B5A",
          600: "#A77F43",
          700: "#826231",
          800: "#614A25",
          900: "#44351B",
        },
        accent: {
          DEFAULT: "#B1977C", // Warm Taupe / Clay - for CTAs
          50: "#f8f5f1",
          100: "#f0e9e0",
          200: "#e0d3c1",
          300: "#cdb89d",
          400: "#B1977C", // Warm Taupe
          500: "#9a7f66",
          600: "#816853",
          700: "#6a5446",
          800: "#58463b",
          900: "#4a3c33",
        },
        neutral: {
          DEFAULT: "#222C2A",
          50: "#F5F3EE",
          100: "#E8E2D8",
          200: "#C9C5BC",
          300: "#A8AAA3",
          400: "#7C8581",
          500: "#55615D",
          600: "#3D4945",
          700: "#303C38",
          800: "#28332F",
          900: "#222C2A",
        },
        "accent-red": "#b91c1c", // Red-700
        "accent-purple": "#7e22ce", // Purple-700
        "accent-blue": "#1d4ed8", // Blue-700
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Playfair Display", "serif"],
        heading: ["Playfair Display", "serif"],
        serif: ["Playfair Display", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out",
        "slide-up": "slideUp 0.6s ease-out",
        "pulse-gentle": "pulseGentle 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(50px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGentle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
        premium: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        glow: "0 0 20px rgba(245, 158, 11, 0.3)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              50: "#f0fdf4",
              100: "#dcfce7",
              200: "#bbf7d0",
              300: "#86efac",
              400: "#4ade80",
              500: "#15803d",
              600: "#166534",
              700: "#15803d",
              800: "#166534",
              900: "#14532d",
              DEFAULT: "#15803d",
              foreground: "#ffffff",
            },
            secondary: {
              50: "#fffbeb",
              100: "#fef3c7",
              200: "#fde68a",
              300: "#fcd34d",
              400: "#fbbf24",
              500: "#b45309",
              600: "#d97706",
              700: "#b45309",
              800: "#92400e",
              900: "#78350f",
              DEFAULT: "#b45309",
              foreground: "#ffffff",
            },
            success: {
              DEFAULT: "#22c55e",
              foreground: "#ffffff",
            },
            warning: {
              DEFAULT: "#f59e0b",
              foreground: "#ffffff",
            },
            background: "#ffffff",
            foreground: "#1f2937",
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: "#22c55e",
              foreground: "#ffffff",
            },
            secondary: {
              DEFAULT: "#f59e0b",
              foreground: "#ffffff",
            },
            background: "#1f2937",
            foreground: "#f9fafb",
          },
        },
      },
    }),
  ],
};
