import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    [
      'btn',
      'px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer inline-flex items-center justify-center border-none',
    ],
    [
      'btn-primary',
      'btn bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-md hover:shadow-lg',
    ],
    [
      'btn-secondary',
      'btn bg-white text-gray-700 border-1 border-gray-200 hover:bg-gray-50 active:scale-95 shadow-sm',
    ],
    ['btn-danger', 'btn bg-red-600 text-white hover:bg-red-700 active:scale-95'],
    ['btn-lg', 'px-8 py-3 text-lg'],
    [
      'input',
      'w-full px-4 py-2 rounded-lg border-1 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all',
    ],
    ['label', 'block text-sm font-medium text-gray-700 mb-1'],
    ['card', 'bg-white rounded-xl shadow-sm border-1 border-gray-100 p-6'],
    ['alert', 'p-4 rounded-lg mb-6 flex items-center'],
    ['alert-success', 'alert bg-green-50 text-green-700 border-1 border-green-100'],
    ['alert-error', 'alert bg-red-50 text-red-700 border-1 border-red-100'],
  ],
  theme: {
    colors: {
      primary: '#4f46e5', // Indigo 600
      secondary: '#06b6d4', // Cyan 500
    },
    fontFamily: {
      sans: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    },
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  transformers: [transformerDirectives()],
})
