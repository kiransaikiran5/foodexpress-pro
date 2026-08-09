/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f0',
          100: '#ffe0df',
          200: '#ffc6c4',
          300: '#ff9e9a',
          400: '#ff6760',
          500: '#ff3b30',
          600: '#e61910',
          700: '#c2130c',
          800: '#a0120d',
          900: '#841612',
        },
        dark: '#1a1a2e',
        card: '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.05)',
        'elevated': '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
}