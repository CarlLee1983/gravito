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
    // console.error(`Failed to load doc: ${lang}/${page}`, e)
    return null
  }
}

const legacyDocs: Record<string, any> = {
  structure: {
    id: '03',
    title: 'Project Structure',
    content: `
        <p>Photon scales from simple microservices to complex enterprise clusters. While we don't enforce a strict folder layout, we recommend a structure that separates logic from infrastructure.</p>
        
        <h3>Recommended Layout</h3>
        <pre><code>├── src/
│   ├── server/       # Engine entry & route definitions
│   │   └── index.ts
│   ├── controllers/  # Business logic isolated from the engine
│   ├── middleware/   # Custom security & logging layers
│   ├── views/        # Prism root templates
│   └── client/       # React/Vue SPA components (Ion)
  ├── config/           # Application configuration
  ├── tests/            # Performance & Integration tests
  └── package.json</code></pre>
  
        <h3>The Orbits System</h3>
        <p>Photon is "Modular by Default". While the full <strong>PlanetCore</strong> framework uses an <code>orbit()</code> system for automation, the standalone engine allows you to achieve the same result by registering middleware and services directly.</p>
        <pre><code>// Example Standalone Integration
  import { auth } from '@gravito/sentinel'
  import { DB } from '@gravito/atlas'
  
  // Register features as standard middleware
  app.use('/api/*', auth())
</code></pre>
      `,
    meta: { lastUpdated: '2026-01-14', complexity: 'BASE_LEVEL', category: 'GETTING_STARTED' },
  },
  prism: {
    id: '11',
    title: 'Prism Templates',
    content: `
        <p>Prism is Photon's native view engine. Inspired by Laravel's Blade, it provides a high-performance, logic-driven approach to server-side HTML rendering.</p>
        
        <h3>Template Compilation</h3>
        <p>Prism templates are not interpreted at runtime. During the build phase (or first access in dev), they are compiled into <strong>Pure JavaScript Functions</strong>. This makes them significantly faster than string-replacement engines.</p>
  
        <h3>Syntax Guide</h3>
        <p>Prism uses a deterministic parser that generates high-speed JS functions from your template files.</p>
        <pre><code>&lt;!-- Syntax Overview --&gt;
  &lt;div&gt;
    @if(user.isAdmin)
      &lt;h1&gt;Core Admin: {{ user.name }}&lt;/h1&gt;
    @else
      &lt;h1&gt;Guest Node: {{{ user.raw_html_label }}}&lt;/h1&gt;
    @endif
  
    &lt;ul&gt;
      #each items as item
        &lt;li&gt;System_Object: {{ item.id }}&lt;/li&gt;
      @each
    &lt;/ul&gt;
  &lt;/div&gt;</code></pre>
  
        <h3>Layouts and Components</h3>
        <pre><code>&lt;!-- layouts/app.prism --&gt;
  &lt;html&gt;
    &lt;body&gt;@yield('content')&lt;/body&gt;
  &lt;/html&gt;
  
  &lt;!-- home.prism --&gt;
  @extends('layouts.app')
  @section('content')
    &lt;h1&gt;Main Feed&lt;/h1&gt;
  @endsection</code></pre>
  
        <div class="callout-tip">
          <p>Image Optimization: Prism includes a built-in <code>&lt;x-image /&gt;</code> component that automatically handles WebP conversion and Core Web Vitals optimizations.</p>
        </div>
      `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'FULLSTACK_SUITE' },
  },
  ion: {
    id: '12',
    title: 'Ion SPA Bridge',
    content: `
        <p>Ion is the definitive bridge for <strong>Inertia.js</strong>. It allows you to build modern Single Page Applications using classic server-side routing, eliminating the need for a separate API layer.</p>
        
        <h3>The Monolith Developer Experience</h3>
        <p>With Ion, you don't write <code>axios.get()</code>. You simply return a component from your controller, and Ion handles the protocol handshake to determine if it should send full HTML (initial load) or a JSON data packet (client-side navigation).</p>
  
        <h3>Rendering Components</h3>
        <pre><code>app.get('/dashboard', (c) => {
    const stats = await db.stats.all()
    return c.inertia('Dashboard', { 
      stats,
      user: c.get('user')
    })
  })
</code></pre>
  
        <h3>Shared State</h3>
        <p>Ion allows you to share data globally across all components (like authenticated user, theme settings, or flash messages) via the <code>inertia.share()</code> API or dedicated middleware.</p>
  
        <div class="callout-tip">
          <p>Seamless Transitions: Because Ion utilizes the X-Inertia protocol, page transitions feel near-instant as only the data (and not the entire shell) is transmitted over the wire.</p>
        </div>
      `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'FULLSTACK_SUITE' },
  },
  atlas: {
    id: '13',
    title: 'Atlas ORM',
    content: `
        <p>Atlas is a powerful, type-safe Data Mapper ORM built specifically for the Photon ecosystem. It supports PostgreSQL, MySQL, and SQLite with a unified, decorator-based syntax.</p>
        
        <h3>Entity Definition</h3>
        <pre><code>import { Model, column, hasMany } from '@gravito/atlas'
  
  @Table('users')
  export class User extends Model {
    @Column({ primary: true }) id: number
    @Column() email: string
    @Column({ type: 'json' }) metadata: any
  }
</code></pre>
  
        <h3>Fluent Query Builder</h3>
        <p>Atlas provides a highly optimized query builder that produces clean, high-performance SQL under the hood.</p>
        <pre><code>const activeUsers = await User.query()
    .where('status', 'active')
    .orderBy('created_at', 'desc')
    .limit(10)
    .execute()
</code></pre>
  
        <h3>Optional Drivers</h3>
        <p>To keep the application footprint small, Atlas utilizes dynamic imports for database drivers. You only install and load the drivers required for your specific environment (e.g., <code>pg</code> or <code>mysql2</code>).</p>
      `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'FULLSTACK_SUITE' },
  },
  testing: {
    id: '14',
    title: 'Testing Suite',
    content: `
        <p>Robust applications require robust tests. Photon provides a first-class testing experience using the <code>bun:test</code> runner, designed for millisecond-level execution.</p>
        
        <h3>Unit Testing Handlers</h3>
        <p>You can test your logic without starting a real TCP server. Photon includes a <code>MockContext</code> to simulate request/response cycles.</p>
        <pre><code>import { test, expect } from 'bun:test'
  import { MockContext } from '@gravito/core/testing'
  
  test('home handler returns 200', async () => {
    const c = new MockContext()
    const res = await homeHandler(c)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('System Online')
  })
</code></pre>
  
        <h3>Integration Tests</h3>
        <p>Photon's <code>app.request()</code> method allows you to perform full end-to-end routing tests in-memory, ensuring your middleware matrix and route parameters are working as expected.</p>
      `,
    meta: { lastUpdated: '2026-01-14', complexity: 'BASE_LEVEL', category: 'ADVANCED' },
  },
  deployment: {
    id: '15',
    title: 'Bun Deployment',
    content: `
        <p>Photon applications are packaged as standard Bun scripts. This makes deployment to cloud providers or on-premise servers extremely straightforward.</p>
        
        <h3>Production Checklist</h3>
        <ul>
          <li><strong>NODE_ENV:</strong> Set to <code>production</code> to enable AOT route caching and template pre-compilation.</li>
          <li><strong>Memory Limits:</strong> Since Bun is efficient, you can run a Photon app on a 256MB micro-instance with ease.</li>
          <li><strong>CPU Clustering:</strong> Use <code>bun run --workers auto</code> to utilize multiple CPU cores.</li>
        </ul>
  
        <h3>Docker Configuration</h3>
        <p>We recommend using the official <code>oven/bun</code> base image for maximum compatibility and minimal image size.</p>
        <pre><code>FROM oven/bun:latest
  WORKDIR /app
  COPY . .
  RUN bun install
  EXPOSE 3333
  ENV NODE_ENV=production
  CMD ["bun", "src/server/index.ts"]
</code></pre>
      `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'ADVANCED' },
  },
  'ex-file-stream': {
    id: 'E02',
    title: 'Zero-Copy Stream',
    content: `
        <p>Leverage Bun's native <code>file()</code> descriptors within Photon to serve binary data without intermediate buffering in the JavaScript heap.</p>
        
        <h3>Implementation Strategy</h3>
        <pre><code>app.get('/video/:id', async (c) => {
    const id = c.req.param('id')
    const file = Bun.file(\`./assets/\\\${id}.mp4\`)
    
    // Photon handles the transition from Bun.file to native Response
    return c.res(file, 200, {
      'Content-Type': 'video/mp4'
    })
  })
</code></pre>
  
        <h3>Why it matters</h3>
        <p>Standard Node.js approaches often "chunk" the data through streams, causing multiple context switches. Photon passes the file descriptor directly to Bun's underlying optimized C++ server, resulting in 0MB heap pressure regardless of file size.</p>
      `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'LAB_EXPERIMENTS' },
  },
  'ex-middleware': {
    id: 'E03',
    title: 'Middleware Pulse',
    content: `
        <p>Learn how to orchestrate complex request life-cycles using Photon's non-blocking middleware architecture.</p>
        
        <h3>The Middleware Chain</h3>
        <pre><code>// 1. Instrumentation Middleware
  app.use(async (c, next) => {
    const start = performance.now()
    await next()
    const end = performance.now()
    c.header('X-Engine-Pulse', \`\${end - start}ms\`)
  })
  
  // 2. Conditional Protection
  app.use('/admin/*', async (c, next) => {
    const token = c.req.header('Authorization')
    if (!token) return c.json({ error: 'UNAUTHORIZED' }, 401)
    return await next()
  })
  
  app.get('/admin/stats', (c) => c.json({ status: 'ACTIVE' }))
</code></pre>
  
        <div class="callout-tip">
          <p>Photon's middleware system uses AOT pre-sorting. This means even a complex chain of 20+ middleware units adds negligible overhead compared to dynamic execution engines.</p>
        </div>
      `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'LAB_EXPERIMENTS' },
  },
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

app.get('/ecosystem', (c) => renderInertia(c, 'Ecosystem', {}))

app.get('/docs/:page', async (c) => {
  const pageParam = c.req.param('page') || 'intro'
  const lang = 'en'

  // Try dynamic first
  let doc = await getDocContent(lang, pageParam)

  if (!doc) {
    doc = legacyDocs[pageParam]
  }

  // Fallback to intro if nothing found
  if (!doc) {
    // If not found in English and not in legacy, try fallback to intro
    doc = await getDocContent(lang, 'intro')
  }

  // Last resort
  if (!doc && pageParam !== 'intro') {
    return c.redirect('/docs/intro')
  }

  return await renderInertia(c, 'Docs', { ...doc, slug: pageParam, lang })
})

app.get('/docs/:lang/:page', async (c) => {
  const pageParam = c.req.param('page') || ''
  const lang = c.req.param('lang') || ''

  let doc = await getDocContent(lang, pageParam)

  // Fallback to English if not found in requested language
  if (!doc && lang !== 'en') {
    doc = await getDocContent('en', pageParam)
  }

  // Fallback to Legacy if still not found (English legacy)
  if (!doc) {
    doc = legacyDocs[pageParam]
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
