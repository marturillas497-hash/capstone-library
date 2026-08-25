/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#003366",
          light: "#004488",
          dark: "#002244",
        },
        gold: {
          DEFAULT: "#FFCC00",
          light: "#FFD633",
          dark: "#E6B800",
        },
        orange: {
          DEFAULT: "#FF7A1F",
          light: "#FF9147",
          dark: "#E56200",
        },
        background: "#F8FAFC",
        foreground: "#0F172A",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};