import { OrbitSitemap } from '@gravito/constellation'
import { type PlanetCore, ServiceProvider } from '@gravito/core'
import { SeoEngine } from '@gravito/luminosity'
import { seoConfig } from '../../config/seo'
import { Category } from '../Models/Category'
import { Product } from '../Models/Product'

export class SeoProvider extends ServiceProvider {
  register() {
    // Registered by OrbitSitemap.install()
  }

  async boot(core: PlanetCore) {
    console.log('[SeoProvider] Booting SEO engine...')
    // 1. Initialize SEO Engine (Robots.txt)
    const seo = new SeoEngine(seoConfig)

    // Serve robots.txt
    core.router.get('/robots.txt', async (c: any) => {
      const robots = seoConfig.robots as any
      let content = ''

      if (robots?.rules) {
        // Handle structured RobotsConfig
        for (const rule of robots.rules) {
          content += `User-agent: ${rule.userAgent}\n`
          if (rule.allow) {
            const allows = Array.isArray(rule.allow) ? rule.allow : [rule.allow]
            allows.forEach((path: string) => {
              content += `Allow: ${path}\n`
            })
          }
          if (rule.disallow) {
            const disallows = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]
            disallows.forEach((path: string) => {
              content += `Disallow: ${path}\n`
            })
          }
          content += '\n'
        }
      } else if (robots) {
        // Fallback for simple object (if any)
        for (const [key, value] of Object.entries(robots)) {
          if (key === 'rules') continue
          if (Array.isArray(value)) {
            value.forEach((v) => {
              content += `${key}: ${v}\n`
            })
          } else {
            content += `${key}: ${value}\n`
          }
        }
      } else {
        content = 'User-agent: *\nAllow: /'
      }

      return new Response(content, {
        headers: { 'Content-Type': 'text/plain' },
      })
    })

    // 2. Initialize Sitemap Generator
    // OrbitSitemap.dynamic handles /sitemap.xml route registration automatically via install()
    OrbitSitemap.dynamic({
      baseUrl: seoConfig.baseUrl,
      providers: [
        // Static Routes
        {
          getEntries: async () => [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/products', changefreq: 'daily', priority: 0.8 },
            { url: '/pages/news', changefreq: 'weekly', priority: 0.7 },
            { url: '/pages/faq', changefreq: 'monthly', priority: 0.5 },
            { url: '/pages/shipping', changefreq: 'monthly', priority: 0.5 },
            { url: '/pages/returns', changefreq: 'monthly', priority: 0.5 },
            { url: '/pages/contact', changefreq: 'monthly', priority: 0.5 },
          ],
        },
        // Products
        {
          getEntries: async () => {
            try {
              const products = await Product.where('is_active', true).get()
              return products.map((p: any) => ({
                url: `/products/${p.slug}`,
                lastmod: p.updated_at ? new Date(p.updated_at) : new Date(),
                changefreq: 'weekly',
                priority: 0.9,
                images: p.image_url ? [{ loc: p.image_url, title: p.name }] : [],
              }))
            } catch (error) {
              console.error('Failed to generate product sitemap entries:', error)
              return []
            }
          },
        },
        // Categories
        {
          getEntries: async () => {
            try {
              const categories = await Category.all()
              return categories.map((c: any) => ({
                url: `/category/${c.slug}`,
                changefreq: 'weekly',
                priority: 0.8,
              }))
            } catch (error) {
              console.error('Failed to generate category sitemap entries:', error)
              return []
            }
          },
        },
      ],
    }).install(core)
  }
}
