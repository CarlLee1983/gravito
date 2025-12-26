import { createInertiaApp } from '@inertiajs/vue3'
import { createApp, type DefineComponent, h } from 'vue'
import './app.css'

import { defineConfig, FreezePlugin } from '@gravito/freeze-vue'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.vue', { eager: true })
    return pages[`./pages/${name}.vue`] as DefineComponent
  },
  setup({ el, App, props, plugin }) {
    const freezeConfig = defineConfig({
      locales: ['en', 'zh'],
      defaultLocale: 'en',
      baseUrl: 'https://lux.gravito.dev',
    })

    createApp({ render: () => h(App, props) })
      .use(plugin)
      .use(FreezePlugin, freezeConfig)
      .mount(el)
  },
})
