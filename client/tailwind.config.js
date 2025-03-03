/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",  // Define your border color
        background: "hsl(var(--background))",  // Add this line
        foreground: "hsl(var(--foreground))",  // Add this line
      }
    },
  },
  plugins: [],
} 