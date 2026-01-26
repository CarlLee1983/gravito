import { createInertiaApp } from '@inertiajs/vue3'
import { createApp, h } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './styles/main.css'

createInertiaApp({
  title: (title) => (title ? `${title} - Gravito Shop` : 'Gravito Shop'),
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.vue', { eager: true })
    return pages[`./pages/${name}.vue`] as any
  },
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .mount(el)
  },
})
