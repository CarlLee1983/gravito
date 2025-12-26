import typography from '@tailwindcss/typography'

export default {
  content: ['./src/views/**/*.html', './src/client/**/*.{js,ts,jsx,tsx}', './src/services/**/*.{js,ts}', '../../docs/**/*.md'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0c4a6e',
        },
        void: '#030303',      // 背景深黑色
        singularity: '#00F0FF', // 電子藍
        event: '#7000FF',      // 深度紫
        panel: '#1A1A1A',     // 卡片背景
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
}
