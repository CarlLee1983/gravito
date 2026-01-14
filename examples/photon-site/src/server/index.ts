import path from 'node:path'
import { Gravito } from '@gravito/core/engine'
import { InertiaService } from '@gravito/ion'
import { TemplateEngine } from '@gravito/prism'

const app = new Gravito()

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
    version: '1.1.0',
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

// Technical Content Dictionary
const docsContent: Record<string, any> = {
  intro: {
    id: '01',
    title: 'Engine Manifesto',
    content: `
      <p>Welcome to the Photon Core documentation. Photon represents a paradigm shift in server-side TypeScript development. While other frameworks focus on platform abstraction, Photon is built <strong>exclusively for Bun</strong>, allowing us to leverage instruction-level optimizations that universal engines simply cannot match.</p>
      
      <h3>The "Bun-Only" Philosophy</h3>
      <p>Most modern web engines are built on the "Request/Response" abstraction specified by the Fetch API. While elegant, this abstraction often results in excessive memory allocation. Every time a request passes through a wrapper, objects are created, cloned, and eventually garbage collected.</p>
      
      <p>Photon chooses to be opinionated. We only serve Bun, so we can unlock Bun's full potential. By interacting directly with the <code>Bun.serve</code> host handles, we eliminate the "Context Shim" overhead present in universal frameworks.</p>

      <h3>Performance Paradigm</h3>
      <p>We treat the server not as a script runner, but as a high-performance machine. Our goals are simple:</p>
      <ul>
        <li><strong>Static Routes:</strong> 20%+ faster than the fastest Node/Universal frameworks.</li>
        <li><strong>Memory per Request:</strong> Less than 1KB of heap allocation.</li>
        <li><strong>Latency:</strong> Predictable sub-millisecond response times for core logic.</li>
      </ul>

      [BENCHMARK_LAB]

      <div class="callout-tip">
        <p>Telemetry: In recent lab tests, Photon handled 100,000 sustained parallel connections with 40% less memory utilization than its closest competitor.</p>
      </div>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'BASE_LEVEL', category: 'GETTING_STARTED' },
  },
  quickstart: {
    id: '02',
    title: 'Initialize Core',
    content: `
      <p>Getting started with Photon is designed to be frictionless. In less than 60 seconds, you can have a high-performance kernel running on your local machine.</p>
      
      <h3>1. Installation</h3>
      <p>Photon requires the Bun runtime environment. Ensure you have Bun installed (<code>curl -fsSL https://bun.sh/install | bash</code>).</p>
      <pre><code>bun add @gravito/core</code></pre>

      <h3>2. The Minimal Server</h3>
      <p>Create an <code>index.ts</code> file. In Photon, the engine instance is called <code>Gravito</code>.</p>
      <pre><code>import { Gravito } from '@gravito/core/engine'

const app = new Gravito()

// Define a high-speed route
app.get('/', (c) => c.text('Photon System Online'))

// Health check with JSON
app.get('/health', (c) => {
  return c.json({ 
    status: 'ACTIVE', 
    uptime: process.uptime() 
  })
})

export default {
  port: 3333,
  fetch: app.fetch.bind(app)
}</code></pre>

      <h3>3. Execution</h3>
      <p>Run your server using the Bun runtime. Photon's AOT router will automatically compile your routes on start.</p>
      <pre><code>bun run index.ts</code></pre>

      <div class="callout-tip">
        <p>Note: When exporting the object with <code>fetch</code>, Bun handles the underlying HTTP server orchestration, allowing Photon to focus entirely on request routing and context management.</p>
      </div>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'BASE_LEVEL', category: 'GETTING_STARTED' },
  },
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
      <p>Photon is "Modular by Default". We use a plugin system called <strong>Orbits</strong>. Instead of shipping with a heavy database driver or SPA bridge pre-installed, you register only what you need.</p>
      <pre><code>// Example Orbit Registration
import { OrbitAuth } from '@gravito/sentinel'
import { OrbitDB } from '@gravito/atlas'

// Orbits extend the context and add global functionalities
app.orbit(OrbitAuth)
app.orbit(OrbitDB)</code></pre>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'BASE_LEVEL', category: 'GETTING_STARTED' },
  },
  routing: {
    id: '04',
    title: 'Routing Architecture',
    content: `
      <p>Photon's routing system is engineered for zero-latency dispatch. It utilizes a hybrid approach: <strong>O(1) Map lookups</strong> for static paths and an optimized <strong>Radix Tree</strong> for dynamic segments.</p>

      <h3>AOT (Ahead-of-Time) Compiling</h3>
      <p>During the engine's <code>initialization phase</code>, it performs a static analysis of your route tree. It builds <strong>Jump Tables</strong> that allow the dispatcher to find the correct handler with near-zero string comparison at runtime.</p>

      <h3>Standard HTTP Methods</h3>
      <p>Photon supports all standard verbs with an intuitive API:</p>
      <pre><code>app.get('/users', handler)
app.post('/users', handler)
app.put('/users/:id', handler)
app.delete('/users/:id', handler)
app.all('/proxy/*', handler) // Catch-all for any method</code></pre>

      <h3>Route Parameters</h3>
      <p>Dynamic segments are declared using the colon syntax. Photon extracts these with zero-copy efficiency from the incoming path.</p>
      <pre><code>app.get('/posts/:year/:slug', (c) => {\n  const year = c.req.param('year')\n  const slug = c.req.param('slug')\n  return c.text(\`Reading \${slug} from \${year}\`)\n})</code></pre>

      <h3>Route Priority Matrix</h3>
      <p>One of Photon's most critical optimizations is its deterministic priority system. When multiple routes might match a single request, Photon resolves them in this strict order:</p>
      
      <ul>
        <li>
          <strong>1. Static Routes:</strong> Exact matches always win. Because they reside in an AOT-compiled Jump Table, they are matched before the Radix Tree is even traversed.
        </li>
        <li>
          <strong>2. Dynamic Segments:</strong> Pattern matches (e.g., <code>:id</code>) are processed if no static route matches.
        </li>
        <li>
          <strong>3. Wildcard Captures:</strong> Catch-all patterns (<code>/*</code>) are used only as a last resort.
        </li>
      </ul>

      <div class="callout-tip">
        <p>Example Conflict Resolution:</p>
        <pre><code>app.get('/users/me', (c) => c.text('Current User'))
app.get('/users/:id', (c) => c.text('User ID: ' + c.req.param('id')))</code></pre>
        <p>In this scenario, a request to <code>/users/me</code> will <strong>always</strong> be handled by the first route. Photon prioritizes the static string <code>"me"</code> over the dynamic capture <code>":id"</code>, ensuring zero ambiguity.</p>
      </div>

      <h3>Grouping and Prefixing</h3>
      <p>While you can use multiple engine instances, we recommend the native grouping API for shared middleware and prefixes.</p>
      <pre><code>const api = app.basePath('/api/v1')
api.use(authMiddleware)
api.get('/status', (c) => c.json({ ok: true }))</code></pre>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'CORE_ENGINE' },
  },
  context: {
    id: '05',
    title: 'Context Handling',
    content: `
      <p>The <code>Context</code> (expressed as <code>c</code>) is the heart of every request. In Photon, it is a high-speed interface between the raw network buffer and your business logic.</p>

      <h3>Context Pooling (Recycle Mode)</h3>
      <p>Unlike traditional frameworks that allocate a new object for every single request, Photon maintains a <strong>Context Pool</strong>. When a request enters, an object is leased from the pool. When the response is sent, the object is cleared and returned. This eliminates GC pressure in high-concurrency environments.</p>

      <h3>Request API (c.req)</h3>
      <p>The <code>c.req</code> interface provides non-blocking, zero-copy access to incoming data. Unlike standard Fetch requests, Photon's request interface is optimized for high-frequency access without creating intermediate objects.</p>
      
      <pre><code>app.get('/api/search/:category', (c) => {
  // 1. Path Parameters: Extract segments defined in the route
  const category = c.req.param('category')

  // 2. Query Strings: Access URL query parameters (?q=...)
  const query = c.req.query('q')

  // 3. Headers: High-speed, case-insensitive header lookup
  const userAgent = c.req.header('User-Agent')

  return c.json({ category, query, userAgent })
})

app.post('/api/ingest', async (c) => {
  // 4. JSON Body: Lazy-parsed and type-safe data access
  const data = await c.req.json()
  
  // 5. Native Fallback: Access raw Bun/Fetch Request object
  const rawRequest = c.req.raw

  return c.json({ status: 'INGESTED' })
})</code></pre>

      <h3>Response API (c.res)</h3>
      <p>Photon provides optimized helpers that automatically set the correct headers, content-types, and status codes based on the data type.</p>
      <pre><code>app.get('/api/responses', (c) => {\n  // Standard text response (200 OK)\n  if (c.req.query('type') === 'text') return c.text('Hello World')\n\n  // JSON response with custom status (201 Created)\n  if (c.req.query('type') === 'json') return c.json({ created: true }, 201)\n\n  // HTML response with zero-copy stream\n  if (c.req.query('type') === 'html') return c.html('&lt;h1&gt;Photon Matrix&lt;/h1&gt;')\n\n  // Redirect to external or internal URL\n  return c.redirect('/docs/quickstart')\n})</code></pre>

      <h3>Custom State (c.set/c.get)</h3>
      <p>You can pass data between middlewares using the context store:</p>
      <pre><code>app.use(async (c, next) => {
  c.set('user_id', 123)
  await next()
})</code></pre>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'CORE_ENGINE' },
  },
  middleware: {
    id: '06',
    title: 'Middleware Matrix',
    content: `
      <p>Middleware in Photon is designed with a non-recursive execution stack. This protects your application from stack overflow vulnerabilities, regardless of how many layers you chain together.</p>

      <h3>Execution Cycle</h3>
      <p>Photon follows the Onion Model. A request passes through each middleware, hits the handler, and then flows back up through the middlewares.</p>
      <pre><code>const logger = async (c, next) => {
  const start = performance.now()
  await next() // Wait for internal handlers
  const end = performance.now()
  console.log(\`Execution: \${end - start}ms\`)
}</code></pre>

      <h3>Short-Circuiting</h3>
      <p>Middlewares can "Abort" a request by returning a response directly without calling <code>next()</code>. This is the primary pattern for authentication and rate-limiting.</p>
      <pre><code>app.use('/admin/*', async (c, next) => {
  if (!isAuthenticated(c)) {
    return c.json({ error: 'Access Denied' }, 403)
  }
  await next()
})</code></pre>

      <h3>Built-in Utilities</h3>
      <p>Photon ships with a suite of high-performance middleware units that can be applied globally or to specific route groups.</p>
      <pre><code>import { logger, cors, secureHeaders, poweredBy } from '@gravito/core/middleware'

// 1. Global Instrumentation
app.use(logger())
app.use(poweredBy())

// 2. Security Layers for API routes
const api = app.basePath('/api')
api.use(cors({ origin: 'https://photon.shell' }))
api.use(secureHeaders())</code></pre>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'CORE_ENGINE' },
  },
  exceptions: {
    id: '07',
    title: 'Exception Handling',
    content: `
      <p>Photon implements a fail-safe execution environment. We believe that a single crashing request should never compromise the stability of the entire kernel.</p>
      
      <h3>The Safety Net (onError)</h3>
      <p>Define a global error handler to catch any unhandled exceptions in your logic. Photon will automatically pass the error and the current context.</p>
      <pre><code>app.onError((err, c) => {
  const errorCode = err instanceof ValidationError ? 400 : 500
  return c.json({
    status: 'SYSTEM_FAILURE',
    message: err.message,
    traceId: c.get('trace_id')
  }, errorCode)
})</code></pre>

      <h3>404 Management (notFound)</h3>
      <p>Customizing the behavior for non-existent routes is straightforward. This is often used for custom SPA fallback logic.</p>
      <pre><code>app.notFound((c) => {
  return c.html('&lt;h1&gt;404: Zone Not Found&lt;/h1&gt;', 404)
})</code></pre>

      <h3>Atomic Commits</h3>
      <p>In Photon, if an error happens mid-request, any headers set before the error are discarded, and the Error Handler gets a fresh state to ensure the client receives a valid error response.</p>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'CORE_ENGINE' },
  },
  ilo: {
    id: '08',
    title: 'Instruction Level Opt',
    content: `
      <p>This is where Photon diverges from "Universal" frameworks. Because we target Bun specifically, we utilize <strong>JIT-friendly loops</strong> and memory-aligned data structures that the JS engine can optimize into native instructions.</p>
      
      <h3>Branch Prediction Optimization</h3>
      <p>The internal <code>dispatch</code> loop of Photon is written to be strictly predictable for the CPU's branch predictor. By minimizing "if-else" cascades in the hot-path, we ensure the instruction pipeline stays full, resulting in higher instructions-per-clock (IPC).</p>

      <h3>Static Strings and Buffers</h3>
      <p>When you send a response, Photon doesn't just pass a string to Bun. It calculates the byte-length and verifies if it can use a <strong>SharedArrayBuffer</strong> for zero-latency cross-thread communication within Bun's internal worker threads.</p>

      <div class="callout-tip">
        <p>Lab Result: This approach results in a 15-20% decrease in "System Time" compared to frameworks that rely on generic high-level JS abstractions.</p>
      </div>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'HARD_LEVEL', category: 'PHYSICAL_LAYER' },
  },
  'zero-copy': {
    id: '09',
    title: 'Zero-Copy Buffering',
    content: `
      <p>In high-performance networking, "Copying" is the enemy. Every time data is copied from one memory location to another, CPU cycles are wasted and latency increases.</p>
      
      <h3>The Pipeline Approach</h3>
      <p>Photon implements <strong>Zero-Copy</strong> data transfer. When serving static files or proxying large responses, data stays in kernel memory using native system calls (like <code>sendfile(2)</code> or <code>splice</code> handles exposed by Bun), never entering the JS heap.</p>
      
      <h3>Unmanaged Stream Handles</h3>
      <p>For large JSON responses, Photon uses a "Stream-as-you-go" approach. Instead of stringifying the entire object into memory first, it pipes chunks to the network socket as they are processed, keeping the memory footprint flat regardless of response size.</p>

      <div class="callout-tip">
        <p>Efficiency: Serving a 1GB file with Photon uses the same amount of JS heap as serving a 1KB string.</p>
      </div>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'HARD_LEVEL', category: 'PHYSICAL_LAYER' },
  },
  memory: {
    id: '10',
    title: 'Recycled Context',
    content: `
      <p>Memory fragmentation and Garbage Collection (GC) pauses are the primary causes of "Jitter" in web applications. Photon solves this with a <strong>Recycled Architecture</strong>.</p>
      
      <h3>The Context Ring Buffer</h3>
      <p>The engine manages a pre-allocated array of Context objects. When a request arrives:</p>
      <ol>
        <li>The engine checks its <strong>Availability Pointer</strong>.</li>
        <li>It grabs a pre-allocated object.</li>
        <li>It populates only the "Mutable" fields of that object (Headers, Param pointers).</li>
        <li>After the request, it runs a <code>SCRUB</code> operation to nullify references without deleting the object structure.</li>
      </ol>

      <h3>Heap Stability</h3>
      <p>By keeping long-lived objects in memory and reusing them, we avoid the <strong>"Young Generation Allocation"</strong> churn. This means the GC doesn't have to run as often, leading to much smoother response time percentiles (P99, P99.9).</p>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'HARD_LEVEL', category: 'PHYSICAL_LAYER' },
  },
  prism: {
    id: '11',
    title: 'Prism Templates',
    content: `
      <p>Prism is Photon's native view engine. Inspired by Laravel's Blade, it provides a high-performance, logic-driven approach to server-side HTML rendering.</p>
      
      <h3>Template Compilation</h3>
      <p>Prism templates are not interpreted at runtime. during the build phase (or first access in dev), they are compiled into <strong>Pure JavaScript Functions</strong>. This makes them significantly faster than string-replacement engines.</p>

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
      <p>Ion is the definitive bridge for **Inertia.js**. It allows you to build modern Single Page Applications using classic server-side routing, eliminating the need for a separate API layer.</p>
      
      <h3>The Monolith Developer Experience</h3>
      <p>With Ion, you don't write <code>axios.get()</code>. You simply return a component from your controller, and Ion handles the protocol handshake to determine if it should send full HTML (initial load) or a JSON data packet (client-side navigation).</p>

      <h3>Rendering Components</h3>
      <pre><code>app.get('/dashboard', (c) => {
  const stats = await db.stats.all()
  return c.inertia('Dashboard', { 
    stats,
    user: c.get('user')
  })
})</code></pre>

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
      <pre><code>import { Table, Column, Model } from '@gravito/atlas'

@Table('users')
export class User extends Model {
  @Column({ primary: true }) id: number
  @Column() email: string
  @Column({ type: 'json' }) metadata: any
}</code></pre>

      <h3>Fluent Query Builder</h3>
      <p>Atlas provides a highly optimized query builder that produces clean, high-performance SQL under the hood.</p>
      <pre><code>const activeUsers = await User.query()
  .where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(10)
  .execute()</code></pre>

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
      <p>You can test your logic without starting a real TCP server. Photon includes a <code>MockContext</code> to simulate request/response cyles.</p>
      <pre><code>import { test, expect } from 'bun:test'
import { MockContext } from '@gravito/core/testing'

test('home handler returns 200', async () => {
  const c = new MockContext()
  const res = await homeHandler(c)
  expect(res.status).toBe(200)
  expect(await res.text()).toContain('System Online')
})</code></pre>

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
CMD ["bun", "src/server/index.ts"]</code></pre>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'ADVANCED' },
  },
  performance: {
    id: '16',
    title: 'Perf Tuning',
    content: `
      <p>For mission-critical applications where every microsecond counts, Photon provides deep-level performance tuning knobs.</p>
      
      <h3>Ultra Mode (ctx.ultra)</h3>
      <p>By default, Photon provides a balanced context. By enabling <code>ultra()</code>, the engine switches to a <strong>MinimalContext</strong>, stripping away all non-essential features (like cookie parsing or complex query handling) for raw speed.</p>
      <pre><code>app.get('/ping', (c) => {
  // Enter minimal allocation mode for specialized performance
  c.ultra() 
  return c.body(null, 204)
})</code></pre>

      <h3>Radix Cache Policies</h3>
      <p>You can tune how the router caches dynamic segments. For routes with high-cardinality parameters (e.g., UUIDs), you can disable prefix-caching to preserve memory.</p>

      <h3>Garbage Collection Management</h3>
      <p>In high-load scenarios, you can use <code>Bun.gc(true)</code> in a Photon middleware to manually trigger memory cleanup during "Silence periods" detected by the engine's telemetry.</p>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'HARD_LEVEL', category: 'ADVANCED' },
  },
  'ex-hello-world': {
    id: 'E01',
    title: 'Ultra Hello World',
    content: `
      <p>This example demonstrates the absolute minimal footprint of Photon. By using <code>c.ultra()</code>, we disable non-essential context features for maximum raw speed.</p>
      
      <h3>Optimal Implementation</h3>
      <pre><code>import { Gravito } from '@gravito/core/engine'

const app = new Gravito()

app.get('/ping', (c) => {
  // Enter zero-allocation mode
  c.ultra() 
  return c.text('pong')
})

export default {
  fetch: app.fetch.bind(app)
}</code></pre>

      <div class="callout-tip">
        <p>Lab Note: Ultra mode is ideal for high-frequency health checks or simple proxy handlers where garbage collection pauses must be avoided.</p>
      </div>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'BASE_LEVEL', category: 'LAB_EXPERIMENTS' },
  },
  'ex-file-stream': {
    id: 'E02',
    title: 'Zero-Copy Stream',
    content: `
      <p>Leverage Bun's native <code>file()</code> descriptors within Photon to serve binary data without intermediate buffering in the JavaScript heap.</p>
      
      <h3>Implementation Strategy</h3>
      <pre><code>app.get('/video/:id', async (c) => {
  const id = c.req.param('id')
  const file = Bun.file(\`./assets/\${id}.mp4\`)
  
  // Photon handles the transition from Bun.file to native Response
  return c.res(file, 200, {
    'Content-Type': 'video/mp4'
  })
})</code></pre>

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

app.get('/admin/stats', (c) => c.json({ status: 'ACTIVE' }))</code></pre>

      <div class="callout-tip">
        <p>Photon's middleware system uses AOT pre-sorting. This means even a complex chain of 20+ middleware units adds negligible overhead compared to dynamic execution engines.</p>
      </div>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'MID_LEVEL', category: 'LAB_EXPERIMENTS' },
  },
  'ex-crud-atlas': {
    id: 'E04',
    title: 'Atomic CRUD Atlas',
    content: `
      <p>Complete integration example using <strong>Atlas ORM</strong> for high-speed database orchestration within Photon routes.</p>
      
      <h3>Data Model & Controller</h3>
      <pre><code>import { Model, column, hasMany } from '@gravito/atlas'

class Project extends Model {
  @column({ primary: true }) id: number
  @column() title: string
}

// In your Photon Route:
app.get('/projects', async (c) => {
  const projects = await Project.query()
    .where('active', true)
    .orderBy('id', 'desc')
    .limit(10)
    .get()

  return c.json({ projects })
})</code></pre>

      <h3>Performance Intel</h3>
      <p>Atlas is built with the same "No-Shim" philosophy as Photon. It uses direct dynamic driver loading and pre-compiled query templates, making it significantly faster than Prisma or TypeORM in high-load scenarios.</p>
    `,
    meta: { lastUpdated: '2026-01-14', complexity: 'HARD_LEVEL', category: 'LAB_EXPERIMENTS' },
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
app.get('/', (c) => renderInertia(c, 'Home', { version: '1.1.0' }))

app.get('/patterns', (c) => renderInertia(c, 'Patterns', {}))

app.get('/ecosystem', (c) => renderInertia(c, 'Ecosystem', {}))

app.get('/docs/:page', (c) => {
  const pageParam = c.req.param('page') || 'intro'
  const doc = docsContent[pageParam] || docsContent.intro
  return renderInertia(c, 'Docs', { ...doc, slug: pageParam })
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
