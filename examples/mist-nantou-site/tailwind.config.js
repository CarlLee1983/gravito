/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ink-black': '#0C0C0C',
        'paper-white': '#F2F0EB',
        'fir-green': '#1D3E35',
        cinnabar: '#A63429',
        'mist-gray': '#D1D5DB',
      },
      fontFamily: {
        display: ['"Long Cang"', 'cursive'], // Switched to Long Cang
        body: ['"Noto Serif TC"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      backgroundImage: {
        'paper-texture': "url('/noise.png')",
      },
    },
  },
  plugins: [],
}
