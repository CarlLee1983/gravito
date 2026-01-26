/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#FFFFFF",
        zenith: {
          void: '#000000', // True OLED Black
          stellar: '#8B5CF6', // Refined Purple (Violet 500)
          pulse: '#3B82F6', // Blue 500
          abyss: '#09090B', // Zinc 950
          surface: '#18181B', // Zinc 900
          900: '#09090B', 
          800: '#18181B',
          500: '#71717A', // Zinc 500
          400: '#A1A1AA', // Zinc 400
          accent: '#00FBFF', // Brighter Cyan
          orange: '#F97316', // High-contrast CTA
        }
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Open Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2), 0 0 10px rgba(0, 240, 255, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(0, 240, 255, 0.4)' },
        }
      },
      backgroundImage: {
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 60H0V0h60v60zM1 1h58v58H1V1z' fill='none' fill-rule='evenodd' stroke='%2300f0ff' stroke-opacity='0.05' stroke-width='1'/%3E%3C/svg%3E")`,
      }
    },
  },
  plugins: [],
}