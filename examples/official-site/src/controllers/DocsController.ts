import type { InertiaService } from '@gravito/orbit-inertia'
import type { Context } from 'hono'
import { DocsService } from '../services/DocsService'
import { getTranslation } from '../services/I18nService'

export class DocsController {
  [key: string]: unknown
  index = async (c: Context) => {
    // Redirect to the first meaningful doc page
    const locale = (c.get('locale') as string) || 'en'
    const prefix = locale === 'zh' ? '/zh' : '/en'
    return c.redirect(`${prefix}/docs/guide/core-concepts`)
  }

  show = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService
    const locale = (c.get('locale') as string) || 'en'

    let slug = c.req.path

    if (locale === 'zh') {
      slug = slug.replace(/^\/zh\/docs\//, '')
    } else if (locale === 'en' && slug.startsWith('/en/')) {
      slug = slug.replace(/^\/en\/docs\//, '')
    } else {
      slug = slug.replace(/^\/docs\//, '')
    }

    const t = getTranslation(locale)
    const page = await DocsService.getPage(locale, slug)
    const sidebar = DocsService.getSidebar(locale)
    const fsLocale = locale === 'zh' ? 'zh-TW' : 'en'
    const editUrl = `https://github.com/gravito-framework/gravito/blob/main/docs/${fsLocale}/${slug}.md`

    if (!page) {
      return inertia.render('Error', { status: 404, message: 'Document not found' })
    }

    const { generateSeoHtml } = await import('../utils/seo')
    const seoHtml = generateSeoHtml(
      locale,
      `${page.title} | Gravito Docs`,
      page.metadata.description as string
    )

    return inertia.render(
      'Docs',
      {
        t,
        locale,
        title: page.title,
        content: page.content,
        metadata: page.metadata,
        toc: page.toc,
        sidebar,
        currentPath: c.req.path,
        editUrl,
      },
      { seoHtml }
    )
  }
}
