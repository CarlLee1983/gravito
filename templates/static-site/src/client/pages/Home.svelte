<script lang="ts">
  import { Head } from '@inertiajs/svelte'
  import Layout from '../components/Layout.svelte'
  import StaticLink from '../components/StaticLink.svelte'

  let { msg, version }: { msg: string; version: string } = $props()

  let count = $state(0)
</script>

<Layout>
  <Head title="Home - Gravito Static Site" />

  <div class="container" style="text-align: center">
    <header>
      <h1>🚀 Gravito Static Site</h1>
      <p class="tagline">
        {msg} (v{version})
      </p>
    </header>

    <div class="stats">
      <div class="stat-card">
        <span class="stat-number">{count}</span>
        <span class="stat-label">Counter Interaction</span>
        <div style="margin-top: 1rem">
          <button
            type="button"
            on:click={() => count++}
            class="endpoint"
            style="cursor: pointer; background: var(--color-primary); color: white"
          >
            Increment
          </button>
        </div>
      </div>
    </div>

    <div class="features">
      <h2>Static Site Navigation</h2>
      <p style="color: var(--color-text-muted); margin-bottom: 1rem">
        This site uses StaticLink for navigation, which automatically uses full page navigation
        in static environments (like GitHub Pages) and Inertia navigation in development.
      </p>
      <StaticLink href="/about" className="endpoint">
        Go to About Page &rarr;
      </StaticLink>
    </div>
  </div>
</Layout>
