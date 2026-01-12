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
        50: '#f0fdfa',
        100: '#ccfbf1',
        200: '#99f6e4',
        300: '#5eead4',
        400: '#2dd4bf',
        500: '#14b8a6',
        600: '#0d9488',
        700: '#0f766e',
        800: '#115e59',
        900: '#134e4a',
        DEFAULT: '#0d9488', // Teal-600 baseline
      },
      secondary: {
        DEFAULT: '#6366f1',
        dark: '#4f46e5',
      },
      dark: {
        bg: '#0f172a',
        surface: '#1e293b',
      },
      accent: {
        DEFAULT: '#f43f5e',
        dark: '#e11d48',
      },
    },
  },
  shortcuts: {
    // Buttons
    btn: 'px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2',
    'btn-primary': 'btn bg-primary text-white hover:bg-primary-600 active:bg-primary-700',
    'btn-secondary': 'btn bg-secondary text-white hover:bg-secondary-dark',
    'btn-accent': 'btn bg-accent text-white hover:bg-accent-dark',
    'btn-outline': 'btn border-2 border-primary text-primary hover:bg-primary hover:text-white',
    'btn-ghost': 'btn text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
    'btn-danger': 'btn bg-red-500 text-white hover:bg-red-600',
    'btn-sm': 'px-3 py-1.5 text-sm',
    'btn-lg': 'px-6 py-3 text-lg',

    // Cards
    card: 'bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden',
    'card-hover':
      'card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 dark:hover:border-primary/20',
    'card-body': 'p-6',

    // Forms
    input:
      'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 dark:text-white',
    label: 'block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5 ml-1',
    'form-group': 'mb-5',

    // Layout
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    section: 'py-12 md:py-16',

    // Typography
    'heading-1': 'text-4xl md:text-5xl font-bold text-gray-900 dark:text-white',
    'heading-2': 'text-3xl md:text-4xl font-bold text-gray-900 dark:text-white',
    'heading-3': 'text-2xl font-semibold text-gray-900 dark:text-white',

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
