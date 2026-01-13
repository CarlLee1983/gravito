import { createInertiaApp } from '@inertiajs/react'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
  }
}

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true })
    return pages[`./pages/${name}.tsx`]
  },
  setup({ el, App, props }) {
    const GAApp = (props: any) => {
      const gaId = props.initialPage.props.ga_id

      useEffect(() => {
        if (gaId && typeof window !== 'undefined') {
          // Initialize GA
          const script = document.createElement('script')
          script.async = true
          script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
          document.head.appendChild(script)

          window.dataLayer = window.dataLayer || []
          window.gtag = function gtag() {
            window.dataLayer.push(arguments)
          }
          window.gtag('js', new Date())
          window.gtag('config', gaId)
        }
      }, [gaId])

      return <App {...props} />
    }

    createRoot(el).render(<GAApp {...props} />)
  },
})
