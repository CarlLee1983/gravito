import type { Context } from '@gravito/core/compat'
import type { InertiaHelper } from '@gravito/ion'
import { DocsService } from '../services/DocsService'
import { getTranslation } from '../services/I18nService'

export class DocsController {
  [key: string]: unknown
  index = async (c: Context) => {
    // Redirect to the first meaningful doc page
    const locale = (c.get('locale') as string) || 'en'
    const prefix = locale === 'zh' ? '/zh' : '/en'
    return c.redirect(`${prefix}/docs/guide/architecture/core-concepts`)
  }

  show = async (c: Context) => {
    const inertia = c.get('inertia') as unknown as InertiaHelper
    const path = c.req.path

    // Improved locale detection: prioritize path prefix
    let locale = 'en'
    if (path.startsWith('/zh/') || path.startsWith('/zh-TW/')) {
      locale = 'zh'
    } else {
      locale = (c.get('locale') as string) || 'en'
    }

    // Clean slug: remove locale and /docs/ prefix
    let slug = path
    slug = slug.replace(/^\/(en|zh|zh-TW)\/docs\//, '')
    slug = slug.replace(/^\/docs\//, '')

    const t = getTranslation(locale)
    const page = await DocsService.getPage(locale, slug)
    const sidebarPrefix = c.req.path.startsWith('/zh-TW/')
      ? '/zh-TW/docs'
      : locale === 'zh'
        ? '/zh/docs'
        : '/en/docs'
    const sidebar = DocsService.getSidebar(locale, sidebarPrefix)
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
      { seoHtml, locale }
    )
  }
}
