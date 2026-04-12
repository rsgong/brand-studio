/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8f0',
          100: '#f9eddb',
          200: '#f2d8b6',
          300: '#e9bc87',
          400: '#df9956',
          500: '#d77e33',
          600: '#c86628',
          700: '#a64e23',
          800: '#854023',
          900: '#6c361f',
        },
      },
    },
  },
  plugins: [],
}
