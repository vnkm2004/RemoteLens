/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pure: {
          black: '#000000',
          dark: '#0a0a0a',
          darkCard: '#121212',
          darkBorder: '#262626',
          white: '#ffffff',
          lightCard: '#ffffff',
          lightBorder: '#e5e5e5',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
