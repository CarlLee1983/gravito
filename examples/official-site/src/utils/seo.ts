import { SeoMetadata } from '@gravito/luminosity'
import { getTranslation } from '../services/I18nService'

export function generateSeoHtml(locale: string, title?: string, description?: string) {
  const t = getTranslation(locale)

  const seo = new SeoMetadata({
    meta: {
      title: title || t?.site?.title || 'Gravito Framework',
      description: description || t?.site?.description || '',
      keywords: (t?.site?.keywords || '')
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean),
    },
    og: {
      title: title || t?.site?.title || 'Gravito Framework',
      type: 'website',
      siteName: 'Gravito Framework',
    },
    twitter: {
      card: 'summary_large_image',
    },
    analytics: {
      gtag: process.env.GA_MEASUREMENT_ID || process.env.VITE_GA_ID,
    },
  })

  return seo.toString()
}
