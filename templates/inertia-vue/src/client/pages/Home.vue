<template>
  <Layout>
    <Head title="Home - Gravito Vue" />

    <div class="container" style="text-align: center">
      <header>
        <h1>🚀 Gravito + Inertia + Vue</h1>
        <p class="tagline">
          {{ msg }} (v{{ version }})
        </p>
      </header>

      <div class="stats">
        <div class="stat-card">
          <span class="stat-number">{{ count }}</span>
          <span class="stat-label">Counter Interaction</span>
          <div style="margin-top: 1rem">
            <button
              type="button"
              @click="count++"
              class="endpoint"
              style="cursor: pointer; background: var(--color-primary); color: white"
            >
              Increment
            </button>
          </div>
        </div>
      </div>

      <div class="features">
        <h2>Try Navigation</h2>
        <p style="color: var(--color-text-muted); margin-bottom: 1rem">
          Click below to verify Inertia's client-side routing (no full reload):
        </p>
        <StaticLink href="/about" class="endpoint">
          Go to About Page &rarr;
        </StaticLink>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { ref } from 'vue'
import Layout from '../components/Layout.vue'
import StaticLink from '../components/StaticLink.vue'

defineProps<{
  msg: string
  version: string
}>()

const count = ref(0)
</script>
