import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx,md}'],
  theme: {
    extend: {
      colors: {
        atlas: {
          cyan: '#00e5ff', // Brighter, cleaner Cyan
          void: '#030712', // Richer Black (Gray 950)
          abyss: '#0f172a', // Deep Slate (Gray 900)
          nebula: '#1e1b4b', // Deep Indigo
          surface: '#111827', // Gray 900
          border: '#1f2937', // Gray 800
        },
        primary: {
          DEFAULT: '#6366f1', // Indigo 500
          glow: '#818cf8', // Indigo 400
          dim: 'rgba(99, 102, 241, 0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'cosmic-gradient': 'radial-gradient(circle at top center, #1e1b4b 0%, #030712 60%)',
        'subtle-grid':
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%236366f1' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 30px rgba(99, 102, 241, 0.2)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      keyframes: {
        'slide-in-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', filter: 'blur(20px)' },
          '50%': { opacity: '0.8', filter: 'blur(25px)' },
        },
      },
      animation: {
        'slide-in-up': 'slide-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
