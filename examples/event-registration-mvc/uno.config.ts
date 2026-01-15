import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    // --- Unified Surface System ---
    ['bg-base', 'bg-white dark:bg-[#020617]'],
    ['bg-soft', 'bg-gray-50/50 dark:bg-[#070d19]'],
    ['bg-card', 'bg-white dark:bg-[#0f172a]'],

    // --- Master Glassmorphism (Refined) ---
    [
      'glass-header',
      'bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5',
    ],
    [
      'glass-premium',
      'bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl border border-gray-100 dark:border-indigo-500/10 shadow-2xl dark:shadow-indigo-900/20',
    ],

    // --- Input & Forms (Tactile) ---
    [
      'input-premium',
      'w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-[#1e293b]/50 border-1 border-transparent dark:border-white/5 focus:bg-white dark:focus:bg-[#1e293b] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all duration-300 text-gray-900 dark:text-gray-100',
    ],
    [
      'label-premium',
      'block text-[10px] font-black text-gray-400 dark:text-indigo-400/60 uppercase tracking-[0.2em] mb-2 ml-1',
    ],

    // --- Interactive Elements ---
    [
      'btn-base',
      'px-6 py-3 rounded-2xl font-black transition-all duration-300 cursor-pointer inline-flex items-center justify-center border-none outline-none active:scale-95 disabled:opacity-50',
    ],
    [
      'btn-primary',
      'btn-base bg-gradient-to-tr from-indigo-600 to-brand-600 text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1',
    ],
    [
      'btn-secondary',
      'btn-base bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#334155] shadow-sm',
    ],

    // --- Data Tables (Premium) ---
    [
      'table-container',
      'bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-xl dark:shadow-black/20 overflow-hidden border border-gray-100 dark:border-white/5',
    ],
    [
      'th-premium',
      'bg-gray-50/50 dark:bg-black/20 px-6 py-4 text-[10px] font-black text-gray-400 dark:text-indigo-300/40 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-white/5',
    ],
    [
      'td-premium',
      'px-6 py-5 text-sm font-medium border-b border-gray-50 dark:border-white/5 group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-500/5 transition-colors dark:text-gray-300',
    ],

    // --- Premium Date Selector ---
    [
      'date-card',
      'relative flex items-center px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-1 border-transparent hover:border-brand-500/30 transition-all duration-300 group cursor-pointer',
    ],
    [
      'date-icon-box',
      'w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm mr-4 group-hover:scale-110 transition-transform',
    ],
    [
      'date-native-input',
      'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 block appearance-none',
    ],

    // --- Layout ---

    ['container-wide', 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'],
  ],
  theme: {
    colors: {
      brand: {
        50: '#f5f3ff',
        100: '#ede9fe',
        200: '#ddd6fe',
        300: '#c4b5fd',
        400: '#a78bfa',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9',
        800: '#5b21b6',
        900: '#4c1d95',
      },
    },
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({ scale: 1.2, cdn: 'https://esm.sh/' }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: ['Inter:400,500,600,700,800', 'Noto Sans TC:400,500,700'],
      },
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
})
