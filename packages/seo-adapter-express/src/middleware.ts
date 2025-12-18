import { RobotsBuilder, type SeoConfig, SeoEngine, SeoRenderer } from '@gravito/seo-core'
import type { NextFunction, Request, Response } from 'express'

export function gravitoSeo(config: SeoConfig) {
  const engine = new SeoEngine(config)
  let initialized = false

  return async (req: Request, res: Response, next: NextFunction) => {
    // Robots.txt Handler
    if (req.path.endsWith('/robots.txt')) {
      if (config.robots) {
        const robotsBuilder = new RobotsBuilder(config.robots, config.baseUrl)
        const content = robotsBuilder.build()
        res.setHeader('Content-Type', 'text/plain')
        res.send(content)
        return
      }
      // Default fallthrough
      const defaultBuilder = new RobotsBuilder(
        {
          rules: [{ userAgent: '*', allow: ['/'] }],
        },
        config.baseUrl
      )
      res.setHeader('Content-Type', 'text/plain')
      res.send(defaultBuilder.build())
      return
    }

    // Sitemap Init
    if (!initialized) {
      try {
        await engine.init()
        initialized = true
      } catch (e) {
        console.error('[GravitoSeo] Init failed:', e)
        return next(e)
      }
    }

    try {
      const strategy = engine.getStrategy()
      const entries = await strategy.getEntries()

      const renderer = new SeoRenderer(config)
      const page = req.query.page ? Number.parseInt(String(req.query.page)) : undefined

      const fullUrl = `${config.baseUrl}${req.path}`

      const xml = renderer.render(entries, fullUrl, page)

      res.header('Content-Type', 'application/xml')
      res.send(xml)
    } catch (e) {
      console.error('[GravitoSeo] Middleware Error:', e)
      next(e)
    }
  }
}
