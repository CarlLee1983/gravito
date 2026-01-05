/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        zenith: {
          void: '#05070A', // Ultra deep background
          stellar: '#9B51E0', // Celestial purple
          pulse: '#2D9CDB', // Tech blue
          900: '#0a0a1f', // Deep space
          800: '#14143a',
          500: '#6366f1', // Indigo
          400: '#818cf8',
          accent: '#00f0ff', // Cyan neon
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
