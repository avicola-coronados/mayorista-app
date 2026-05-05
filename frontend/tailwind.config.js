/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "coronados-orange": "#E8471A",
        "coronados-green": "#2E8B3A",
      },
      fontFamily: {
        sans: ["Space Grotesk", "sans-serif"],
        display: ["Instrument Serif", "serif"],
      },
      boxShadow: {
        soft: "0 18px 40px rgba(232, 71, 26, 0.12)",
      },
    },
  },
  plugins: [],
};
