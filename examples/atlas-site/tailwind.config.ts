import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx,md}'],
  theme: {
    extend: {
      colors: {
        atlas: {
          cyan: '#00e5ff',
          void: '#0B0B10', // Deep Space Black
          abyss: '#111116',
          nebula: '#1e1b4b',
          surface: '#16161E',
          border: '#1E1E26',
          metallic: '#94A3B8',
          star: '#F8FAFC',
        },
        primary: {
          DEFAULT: '#3B82F6', // Trust Blue
          glow: '#60A5FA',
          dim: 'rgba(59, 130, 246, 0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'cosmic-gradient': 'radial-gradient(circle at top center, #1e1b4b 0%, #0B0B10 70%)',
        'subtle-grid':
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%233B82F6' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E\")",
        'noise-pattern': "url('https://grainy-gradients.vercel.app/noise.svg')",
        'nebula-arc':
          'radial-gradient(ellipse at 50% 100%, rgba(59, 130, 246, 0.15), transparent 70%)',
        'light-ray': 'linear-gradient(to top, transparent, rgba(59, 130, 246, 0.05), transparent)',
        'data-stream':
          'linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.2) 50%, transparent)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(59, 130, 246, 0.25)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.15)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'inner-glow': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)',
      },
      keyframes: {
        'data-flow': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(1000%)', opacity: '0' },
        },
        'border-flow': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
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
        'ray-move': {
          '0%, 100%': {
            transform: 'translateX(-50%) translateY(-10%) rotate(-5deg)',
            opacity: '0.3',
          },
          '50%': { transform: 'translateX(-50%) translateY(0%) rotate(5deg)', opacity: '0.6' },
        },
      },
      animation: {
        'slide-in-up': 'slide-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'border-flow': 'border-flow 3s ease infinite',
        'ray-move': 'ray-move 10s ease-in-out infinite',
        'data-flow': 'data-flow 8s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
