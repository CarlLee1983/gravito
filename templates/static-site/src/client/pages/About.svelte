<script lang="ts">
  import { Head } from '@inertiajs/svelte'
  import Layout from '../components/Layout.svelte'
  import StaticLink from '../components/StaticLink.svelte'

  let { version }: { version: string } = $props()
</script>

<Layout>
  <Head title="About - Gravito Static Site" />

  <div class="container" style="text-align: center; padding: 2rem">
    <header>
      <h1>About This Static Site</h1>
      <p class="tagline">Version {version}</p>
    </header>

    <div style="max-width: 600px; margin: 0 auto; text-align: left">
      <h2>Built with Gravito</h2>
      <p>
        This is a static site generated with Gravito + Inertia.js + Svelte. It can be deployed to
        GitHub Pages, Vercel, Netlify, or any static hosting provider.
      </p>

      <h3>Key Features</h3>
      <ul>
        <li>✅ Uses StaticLink for proper navigation in static environments</li>
        <li>✅ Automatic detection of static vs dynamic environments</li>
        <li>✅ Full page navigation in production, SPA navigation in development</li>
        <li>✅ Pre-configured build script for static site generation</li>
      </ul>

      <div style="margin-top: 2rem">
        <StaticLink href="/" className="endpoint">
          ← Back to Home
        </StaticLink>
      </div>
    </div>
  </div>
</Layout>
