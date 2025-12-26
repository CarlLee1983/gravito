import type { GravitoContext } from 'gravito-core'
import { DocsService } from '../services/DocsService'

export class DocsController {
  show = async (c: GravitoContext) => {
    // biome-ignore lint/suspicious/noExplicitAny: Inertia type
    const inertia = c.get('inertia') as any
    const _locale = (c.get('locale') as string) || 'en'

    // Remove locale prefix and /docs prefix to get the clean slug
    let path = c.req.path
    if (path.startsWith('/zh')) {
      path = path.replace('/zh', '')
    }
    if (path.startsWith('/en')) {
      path = path.replace('/en', '')
    }

    const slug = path.replace(/^\/docs\/?/, '') || 'introduction'

    // Pass locale to DocsService
    const page = await DocsService.getDoc(slug, _locale)
    const sidebar = await DocsService.getSidebar(_locale)

    if (!page) {
      return inertia.render('NotFound', {
        status: 404,
        message: 'Document not found',
        locale: _locale,
      })
    }

    return inertia.render('Docs', {
      title: page.meta.title, // Access title from meta
      content: page.content,
      toc: [], // DocsService.getDoc doesn't return TOC yet, pass empty or implement
      sidebar,
      currentPath: c.req.path,
      locale: _locale,
    })
  }
}
