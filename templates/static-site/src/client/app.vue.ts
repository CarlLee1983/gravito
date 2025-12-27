import { createInertiaApp } from '@inertiajs/vue3'
import { createApp, type DefineComponent } from 'vue'
import './styles.css'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob<{ default: DefineComponent }>('./pages/**/*.vue', {
      eager: true,
    })
    return pages[`./pages/${name}.vue`]?.default
  },
  setup({ el, App, plugin }) {
    createApp({ render: () => App })
      .use(plugin)
      .mount(el)
  },
})
