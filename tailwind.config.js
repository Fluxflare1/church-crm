/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Your exact brand colors
        primary: {
          red: '#c41e3a',
          dark: '#1a1a1a', 
          gold: '#d4af37',
        },
        gray: {
          100: '#f8f9fa',
          200: '#e9ecef', 
          600: '#6c757d',
          800: '#343a40',
        }
      },
    },
  },
  plugins: [],
}
