import fs from 'node:fs/promises'
import path from 'node:path'
import { Gravito } from '@gravito/core/engine'
import { InertiaService } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'

/**
 * Photon Static Site Builder
 */
async function build() {
  console.log('🚀 Starting Photon Static Build...')

  const staticDir = path.join(process.cwd(), 'dist/static')
  await fs.mkdir(staticDir, { recursive: true })

  const prism = new OrbitPrism()

  const renderPage = async (url: string, component: string, props: any) => {
    console.log(`📦 Rendering ${url}...`)

    // Store for set/get
    const store = new Map<string, any>()
    store.set('view', prism)

    // Complete mock context for InertiaService
    const mockCtx = {
      req: {
        url,
        method: 'GET',
        header: (name: string) => undefined,
      },
      header: () => {},
      status: () => {},
      set: (key: string, val: any) => store.set(key, val),
      get: (key: string) => store.get(key),
      html: (content: string) =>
        new Response(content, { headers: { 'content-type': 'text/html' } }),
    }

    const inertia = new InertiaService(mockCtx as any, {
      version: '1.1.0',
      rootView: './src/views/app.html',
    })

    const response = await inertia.render(component, props)
    const html = await response.text()

    const outputPath = path.join(staticDir, url === '/' ? 'index.html' : `${url}.html`)
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, html)
  }

  await renderPage('/', 'Home', { version: '1.1.0' })
  console.log('✨ Static build complete!')
}

build().catch(console.error)
