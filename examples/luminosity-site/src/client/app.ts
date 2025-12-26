import { createInertiaApp } from '@inertiajs/vue3'
import { createApp, type DefineComponent, h } from 'vue'
import './app.css'

import { defineConfig, FreezePlugin } from '@gravito/freeze-vue'

createInertiaApp({
  resolve: (name) => {
    // biome-ignore lint/suspicious/noExplicitAny: Vite glob type
    const pages = import.meta.glob('./pages/**/*.vue')
    const page = pages[`./pages/${name}.vue`]
    if (!page) {
      console.error(`Page not found: ${name}. Available pages:`, Object.keys(pages))
      throw new Error(`Page not found: ${name}`)
    }
    // biome-ignore lint/suspicious/noExplicitAny: Inertia resolve type
    return page() as any
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
