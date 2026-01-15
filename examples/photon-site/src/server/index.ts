import path from 'node:path'
import { Gravito } from '@gravito/core/engine'
import { InertiaService } from '@gravito/ion'
import { TemplateEngine } from '@gravito/prism'

export const app = new Gravito()

// Add global middleware to ensure FastContext is used for all routes.
// This is required for Inertia as it needs to set the X-Inertia header,
// which is not supported in the ultra-optimized MinimalContext.
app.use(async (_, next) => {
  return await next()
})

// Explicit static routes for known assets
app.get('/favicon.svg', () => {
  return new Response(Bun.file(path.join(process.cwd(), 'public/favicon.svg')), {
    headers: { 'Content-Type': 'image/svg+xml' },
  })
})

const isDev = process.env.NODE_ENV === 'development'

const viewsDir = path.join(process.cwd(), 'src/views')
const engine = new TemplateEngine(viewsDir)

// Reusable render helper to ensure consistent Inertia headers
const renderInertia = async (c: any, component: string, props: any) => {
  const store = new Map<string, any>()
  store.set('view', engine)

  // Bridge FastContext to support Inertia requirements
  const bridge = Object.assign(c, {
    set: (key: string, val: any) => store.set(key, val),
    get: (key: string) => store.get(key),
  })

  const inertia = new InertiaService(bridge as any, {
    version: '1.2.0',
    rootView: 'app',
  })

  // The actual fix: InertiaService.render returns a Response object.
  // We need to return this response directly.
  const response = await inertia.render(component, {
    ...props,
    isDev,
  })

  // Transfer headers from the Inertia response to our context if needed,
  // or simply return the response object which Photon (Gravito Engine) supports.
  return response
}

// ----------------------------------------------------------------------------
// Documentation Handler (Dynamic)
// ----------------------------------------------------------------------------

async function getDocContent(lang: string, page: string) {
  try {
    // Dynamic import based on language and page
    // We use a relative path from this file.
    const doc = await import(`./data/docs/${lang}/${page}.json`)
    return doc.default || doc
  } catch (e) {
    return null
  }
}

const legalContent: Record<string, any> = {
  privacy: {
    id: 'L01',
    title: 'Privacy Policy',
    lastUpdated: '2026-01-14',
    content: `
      <h3>1. Data Collection Protocol</h3>
      <p>Photon Engine is designed with a "Local-First" data priority. We do not collect, store, or transmit any personal data by default. Any telemetry data collected through the <code>logger()</code> middleware session resides exclusively within your runtime environment.</p>

      <h3>2. Local Session Data</h3>
      <p>When using the documentation or experimentation labs, session state may be stored in your browser's <code>localStorage</code> purely for interface persistence. This data never leaves your terminal.</p>

      <h3>3. External Interfaces</h3>
      <p>The Photon site may link to third-party modules (e.g., GitHub, NPM). Interactions with these modules are governed by their respective privacy protocols. We advocate for the use of self-hosted alternatives where protocol security is mission-critical.</p>

      <h3>4. Security Matrix</h3>
      <p>We implement the <code>secureHeaders()</code> protocol globally. This includes strict Content Security Policy (CSP), HSTS enforcement, and XSS filtering to ensure your interaction with our infrastructure is protected at the kernel level.</p>
    `,
  },
  terms: {
    id: 'L02',
    title: 'Terms of Use',
    lastUpdated: '2026-01-14',
    content: `
      <h3>1. Protocol License</h3>
      <p>Photon Engine and its documentation are licensed under the <strong>MIT License</strong>. You are free to use, copy, modify, and distribute the software for any purpose, provided the copyright notice and license are included.</p>

      <h3>2. Acceptable Sequence</h3>
      <p>Users are expected to interact with our documentation and experimentation labs in a non-destructive manner. Automated scraping or stress-testing against our host nodes is restricted by the <code>ShieldV6</code> firewall.</p>

      <h3>3. Disclaimer of Liability</h3>
      <p>The software is provided "as is", without warranty of any kind. Gravito Research Labs and the contributors shall not be liable for any claim, damages or other liability arising from the use of the engine in production environments.</p>

      <h3>4. Ecosystem Governance</h3>
      <p>By using the Photon Engine, you acknowledge that you are operating within the Gravito Framework Ecosystem. We reserve the right to update the technical specifications of these protocols without prior broadcast.</p>
    `,
  },
}

// Routes
app.get('/', (c) => renderInertia(c, 'Home', { version: '1.2.0' }))

app.get('/patterns', (c) => renderInertia(c, 'Patterns', {}))

app.get('/ecosystem', (c) => {
  const queryLang = c.req.query('lang')
  const lang = queryLang === 'zh-TW' ? 'zh-TW' : 'en'
  return renderInertia(c, 'Ecosystem', { lang })
})

app.get('/docs/:page', async (c) => {
  const pageParam = c.req.param('page') || 'intro'
  // Support ?lang=zh-TW
  const queryLang = c.req.query('lang')
  const lang = queryLang === 'zh-TW' ? 'zh-TW' : 'en'

  // Try dynamic first
  let doc = await getDocContent(lang, pageParam)

  // If missing in requested language (e.g. zh-TW), fallback to English
  if (!doc && lang !== 'en') {
    doc = await getDocContent('en', pageParam)
  }

  // Fallback to intro if nothing found
  if (!doc) {
    // If not found in English, try fallback to intro in requested lang
    doc = await getDocContent(lang, 'intro')
    // If still not found, try intro in English
    if (!doc) {
      doc = await getDocContent('en', 'intro')
    }
  }

  // Last resort
  if (!doc && pageParam !== 'intro') {
    return c.redirect(`/docs/intro?lang=${lang}`)
  }

  return await renderInertia(c, 'Docs', { ...doc, slug: pageParam, lang })
})

app.get('/docs/:lang/:page', async (c) => {
  const pageParam = c.req.param('page') || ''
  const langParam = c.req.param('lang') || ''
  const lang = langParam === 'zh-TW' ? 'zh-TW' : 'en'

  let doc = await getDocContent(lang, pageParam)

  // Fallback to English if not found in requested language
  if (!doc && lang !== 'en') {
    doc = await getDocContent('en', pageParam)
  }

  if (!doc) {
    return c.redirect(`/docs/${lang}/intro`)
  }

  return await renderInertia(c, 'Docs', { ...doc, slug: pageParam, lang })
})

app.get('/legal/:page', (c) => {
  const pageParam = c.req.param('page')
  const content = (legalContent as any)[pageParam || '']
  if (!content) return c.redirect('/')
  return renderInertia(c, 'Legal', { ...content, slug: pageParam })
})

export default {
  port: 3333,
  fetch: app.fetch.bind(app),
}

console.log('🚀 PHOTON_ENGINE // ACTIVE_ON: http://localhost:3333')
