import { createInertiaApp } from '@inertiajs/vue3'
import axios from 'axios'
import { createApp, h } from 'vue'
import 'virtual:uno.css'
import './main.css'

// Standard CSRF Configuration for Axios
// This ensures all requests (including Inertia) automatically use XSRF-TOKEN from cookies
axios.defaults.withCredentials = true
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.vue', { eager: true })
    const path = `./pages/${name}.vue`
    const page = pages[path] as any

    if (!page) {
      console.error(`Component not found: ${path}. Available pages:`, Object.keys(pages))
      throw new Error(`Page component "${name}" not found at "${path}"`)
    }

    return page.default || page
  },
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .mount(el)
  },
})
