import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        atlas: {
          cyan: '#00f0ff', // Neon Cyan
          void: '#000000', // Pure Black
          abyss: '#080808', // Off Black
          nebula: '#1a0b2e', // Deep Purple
          structure: '#16213e', // Dark Blue/Grey for structure
        },
      },
      backgroundImage: {
        'cosmic-gradient': 'radial-gradient(circle at center, #1a0b2e 0%, #000000 100%)',
        'grid-pattern':
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%2300f0ff' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
} satisfies Config
