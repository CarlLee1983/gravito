import { gravitoSeo } from '@gravito/luminosity-adapter-express'
import express from 'express'

const app = express()
const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`

const seoMiddleware = gravitoSeo({
  mode: 'dynamic',
  baseUrl,
  resolvers: [
    {
      name: 'static-pages',
      fetch: () => [
        { url: '/', changefreq: 'daily', priority: 1 },
        { url: '/about', changefreq: 'weekly', priority: 0.7 },
        { url: '/pricing', changefreq: 'monthly', priority: 0.6 },
      ],
    },
  ],
  robots: {
    rules: [{ userAgent: '*', allow: ['/'] }],
  },
})

app.get('/', (req, res) => {
  res.type('text/plain').send('Gravito Luminosity (Node + Express)')
})

app.get('/sitemap.xml', seoMiddleware)
app.get('/robots.txt', seoMiddleware)

app.listen(port, () => {
  console.log(`Node sitemap demo running at ${baseUrl}`)
  console.log('Try /sitemap.xml and /robots.txt')
})
