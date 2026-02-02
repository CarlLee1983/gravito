import { createInertiaApp, Head, Link } from '@inertiajs/vue3'
import { createApp, h } from 'vue'
import './app.css'

import { defineConfig, FreezePlugin, StaticLink } from '@gravito/freeze-vue'
import Footer from './components/Footer.vue'
// Components
import Layout from './components/Layout.vue'
import Logo from './components/Logo.vue'
import Nav from './components/Nav.vue'
import SpotlightCard from './components/SpotlightCard.vue'

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
      locales: ['en', 'zh'] as any,
      defaultLocale: 'en' as any,
      baseUrl: 'https://lux.gravito.dev',
      staticDomains: ['gravito.dev', 'lux.gravito.dev'],
    })

    const app = createApp({ render: () => h(App, props) })
      .use(plugin)
      .use(FreezePlugin, { config: freezeConfig, LinkComponent: Link })

    // Global Components
    app.component('Layout', Layout)
    app.component('Nav', Nav)
    app.component('Footer', Footer)
    app.component('Logo', Logo)
    app.component('SpotlightCard', SpotlightCard)
    app.component('StaticLink', StaticLink)
    app.component('Head', Head)

    app.mount(el)
  },
})
