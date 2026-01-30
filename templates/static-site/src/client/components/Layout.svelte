<script lang="ts">
import StaticLink from './StaticLink.svelte'

let path = $state(typeof window !== 'undefined' ? window.location.pathname : '/')
</script>

<div class="app-layout">
  <header class="main-header">
    <div class="container">
      <StaticLink href="/" className="brand">
        🚀 Gravito Static Site
      </StaticLink>
      <nav>
        <StaticLink href="/" className={path === '/' ? 'active' : ''}>
          Home
        </StaticLink>
        <StaticLink href="/about" className={path.startsWith('/about') ? 'active' : ''}>
          About
        </StaticLink>
      </nav>
    </div>
  </header>

  <main><slot /></main>

  <footer class="main-footer">
    <div class="container">
      Built with
      <a href="https://github.com/gravito-framework/gravito" target="_blank" rel="noopener">
        Gravito
      </a>
      + Inertia + Svelte (Static Site)
    </div>
  </footer>
</div>
