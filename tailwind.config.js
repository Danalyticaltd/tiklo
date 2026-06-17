/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        accent: '#F59E0B',
        bg: '#0F0F0F',
        surface: '#1A1A2E',
        muted: '#94A3B8',
      },
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
