<template>
  <div class="app-layout">
    <header class="main-header">
      <div class="container">
        <StaticLink href="/" class="brand"> 🚀 Gravito Static Site </StaticLink>
        <nav>
          <StaticLink href="/" :class="{ active: path === '/' }"> Home </StaticLink>
          <StaticLink href="/about" :class="{ active: path.startsWith('/about') }"> About </StaticLink>
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
        + Inertia + Vue (Static Site)
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StaticLink from './StaticLink.vue'

defineProps<{ children?: any }>()

const path = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.pathname
  }
  return '/'
})
</script>

