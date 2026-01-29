/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/client/**/*.{js,ts,jsx,tsx,vue}',
    './src/services/**/*.{js,ts}',
    './src/views/**/*.html',
    './docs/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#000000',
        singularity: '#10B981', // Emerald 500 - The core brand green
        event: '#059669', // Darker emerald for gradients
        accent: '#F97316', // Keeping orange for high-contrast CTA
        panel: '#09090B',
        surface: '#18181B',
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Open Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
