import type { InertiaService } from '@gravito/orbit-inertia'
import type { Context } from 'hono'
import { DocsService } from '../services/DocsService'
import { getTranslation } from '../services/I18nService'

export class DocsController {
  index = async (c: Context) => {
    // Redirect to the first meaningful doc page
    // In reality, this might be an index page, but for now redirect to core-concepts
    const locale = (c.get('locale') as string) || 'en'
    const prefix = locale === 'zh' ? '/zh' : ''
    return c.redirect(`${prefix}/docs/guide/core-concepts`)
  }

  show = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService
    const locale = (c.get('locale') as string) || 'en'

    // Parse slug from path since :slug+ might be flaky with router wrapper
    // /docs/foo/bar -> foo/bar
    // /zh/docs/foo/bar -> foo/bar
    let slug = c.req.path

    if (locale === 'zh') {
      slug = slug.replace(/^\/zh\/docs\//, '')
    } else {
      slug = slug.replace(/^\/docs\//, '')
    }

    const t = getTranslation(locale)
    const page = await DocsService.getPage(locale, slug)
    const sidebar = DocsService.getSidebar(locale)
    const fsLocale = locale === 'zh' ? 'zh-TW' : 'en'
    const editUrl = `https://github.com/CarlLee1983/gravito-core/blob/main/docs/${fsLocale}/${slug}.md`

    if (!page) {
      // Render 404
      return c.text('Document not found', 404)
      // In future: inertia.render('Error', { status: 404 })
    }

    return inertia.render('Docs', {
      t,
      locale,
      title: page.title,
      content: page.content,
      metadata: page.metadata,
      toc: page.toc,
      sidebar,
      currentPath: c.req.path,
      editUrl,
    })
  }
}
