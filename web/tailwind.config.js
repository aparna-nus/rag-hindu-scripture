/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {},
  plugins: [],
  extend: {
  animation: {
    pulseSlow: "pulse 1.4s ease-in-out infinite",
  }
}

};
