import { defineConfig, presetIcons, presetTypography, presetWebFonts, presetWind } from 'unocss'

export default defineConfig({
  presets: [
    presetWind(),
    presetTypography(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
    }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Inter:300,400,500,600,700',
        display: 'Outfit:400,500,600,700',
        mono: 'Fira Code',
      },
    }),
  ],
  theme: {
    colors: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
        DEFAULT: '#2563eb', // Royal Blue
      },
      secondary: {
        DEFAULT: '#8b5cf6', // Violet
        dark: '#7c3aed',
      },
      dark: {
        bg: '#020617', // Slate 950
        surface: '#0f172a', // Slate 900
        surfaceHighlight: '#1e293b', // Slate 800
      },
      accent: {
        DEFAULT: '#f43f5e',
        dark: '#e11d48',
      },
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
    },
  },
  shortcuts: {
    // Buttons
    btn: 'px-5 py-2.5 rounded-xl font-medium transition-all duration-300 cursor-pointer inline-flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm',
    'btn-primary':
      'btn bg-primary text-white hover:bg-primary-500 hover:shadow-lg hover:shadow-primary/30 active:bg-primary-700',
    'btn-secondary':
      'btn bg-secondary text-white hover:bg-secondary-dark hover:shadow-lg hover:shadow-secondary/30',
    'btn-accent':
      'btn bg-accent text-white hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/30',
    'btn-outline':
      'btn border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary bg-transparent',
    'btn-ghost':
      'btn text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-surfaceHighlight shadow-none',
    'btn-danger':
      'btn bg-danger text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30',
    'btn-sm': 'px-3.5 py-1.5 text-sm rounded-lg',
    'btn-lg': 'px-8 py-3.5 text-lg rounded-2xl',

    // Cards
    card: 'bg-white dark:bg-dark-surface/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300',
    'card-hover':
      'card hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/50 hover:border-primary/20 dark:hover:border-primary/30',
    'card-body': 'p-6',

    // Forms
    input:
      'w-full px-4 py-3 bg-white dark:bg-dark-surfaceHighlight/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 dark:text-white',
    label: 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1',
    'form-group': 'mb-6',

    // Layout
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    section: 'py-16 md:py-24',

    // Typography
    'heading-1':
      'text-4xl md:text-6xl font-display font-bold text-gray-900 dark:text-white leading-tight tracking-tight',
    'heading-2':
      'text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white leading-tight tracking-tight',
    'heading-3': 'text-2xl font-display font-semibold text-gray-900 dark:text-white',
    'text-body': 'text-gray-600 dark:text-gray-400 leading-relaxed',

    // Badges
    badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    'badge-primary': 'badge bg-primary-100 text-primary-800',
    'badge-success': 'badge bg-green-100 text-green-800',
    'badge-warning': 'badge bg-yellow-100 text-yellow-800',
    'badge-danger': 'badge bg-red-100 text-red-800',

    // Grid
    'product-grid': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',

    // Navigation
    'nav-link':
      'text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors',
    'nav-link-active': 'text-primary font-medium',
  },
  safelist: [
    'i-heroicons-shopping-cart',
    'i-heroicons-user',
    'i-heroicons-magnifying-glass',
    'i-heroicons-heart',
    'i-heroicons-bars-3',
    'i-heroicons-x-mark',
    'i-heroicons-plus',
    'i-heroicons-minus',
    'i-heroicons-trash',
    'i-heroicons-check',
    'i-heroicons-arrow-right',
  ],
})
