import { defineConfig, FreezeProvider } from '@gravito/freeze-react'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const config = defineConfig({
  staticDomains: ['photon.gravito.dev'],
  locales: ['en', 'zh-TW'],
  defaultLocale: 'en',
  baseUrl: 'https://photon.gravito.dev',
})

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true })
    return pages[`./pages/${name}.tsx`]
  },
  setup({ el, App, props }) {
    // Extract lang from initial page props if available
    const initialLang = (props.initialPage.props as any).lang as string | undefined

    createRoot(el).render(
      <FreezeProvider config={config} locale={initialLang}>
        <App {...props} />
      </FreezeProvider>
    )
  },
})
