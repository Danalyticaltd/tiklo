/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
      },
      colors: {
        primary: '#635BFF',
        navy:    '#0A2540',
        cyan:    '#00D4FF',
        success: '#22C55E',
        accent:  '#00D4FF',
        bg:      '#FFFFFF',
        surface: '#F6F9FC',
        muted:   '#6B7C93',
      },
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      })
    },
  ],
}
