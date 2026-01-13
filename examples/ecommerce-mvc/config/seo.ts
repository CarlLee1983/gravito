import type { SeoConfig } from '@gravito/luminosity'

export const seoConfig: SeoConfig = {
  mode: 'dynamic',
  baseUrl: process.env.APP_URL || 'http://localhost:3070',
  robots: {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/admin/', '/cart/', '/checkout/', '/account/', '/api/'],
      },
    ],
  },
  resolvers: [],
}
