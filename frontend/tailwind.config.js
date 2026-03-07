/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0F172A", foreground: "#F8FAFC" },
        secondary: { DEFAULT: "#F5F5F4", foreground: "#1C1917" },
        accent: { DEFAULT: "#F43F5E", foreground: "#FFFFFF", dark: "#BE123C" },
        muted: { DEFAULT: "#E7E5E4", foreground: "#57534E" },
        success: { DEFAULT: "#0D9488", foreground: "#FFFFFF" },
        warning: { DEFAULT: "#D97706", foreground: "#FFFFFF" },
        sand: { 50: "#FAFAF9", 100: "#F5F5F4", 200: "#E7E5E4", 300: "#D6D3D1", 400: "#A8A29E" },
        ocean: { 50: "#F8FAFC", 100: "#F1F5F9", 600: "#475569", 800: "#1E293B", 900: "#0F172A", 950: "#020617" },
      },
      fontFamily: {
        heading: ["Playfair Display", "serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
