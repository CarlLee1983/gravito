<template>
  <div class="app-layout">
    <header class="main-header">
      <div class="container">
        <StaticLink href="/" class="brand">
          🚀 Gravito
        </StaticLink>
        <nav>
          <StaticLink href="/" :class="{ active: isHome }">
            Home
          </StaticLink>
          <StaticLink href="/about" :class="{ active: isAbout }">
            About
          </StaticLink>
        </nav>
      </div>
    </header>

    <main><slot /></main>

    <footer class="main-footer">
      <div class="container">
        Built with
        <a href="https://github.com/GravitoJS" target="_blank" rel="noopener">
          Gravito
        </a>
        + Inertia + Vue
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

const page = usePage()
const _isHome = computed(() => page.url === '/')
const _isAbout = computed(() => page.url.startsWith('/about'))
</script>
