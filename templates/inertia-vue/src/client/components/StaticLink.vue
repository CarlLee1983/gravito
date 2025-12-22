<template>
  <component :is="linkComponent" v-bind="linkProps">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'

interface Props {
  href: string
  as?: string
  method?: string
  data?: Record<string, unknown>
  replace?: boolean
  preserveScroll?: boolean
  preserveState?: boolean
  only?: string[]
  except?: string[]
  headers?: Record<string, string>
  queryStringArrayFormat?: 'brackets' | 'indices'
  class?: string
  [key: string]: unknown
}

const props = defineProps<Props>()

/**
 * 檢測是否在靜態網站環境中（GitHub Pages、Vercel、Netlify 等）
 * 在靜態環境中，沒有後端伺服器處理 Inertia 的 AJAX 請求，
 * 因此需要使用普通的 <a> 標籤進行完整頁面導航
 */
function isStaticSite(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const hostname = window.location.hostname
  const port = window.location.port

  // 🔥 Static preview server detection (bun run build:preview)
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '4173') {
    return true
  }

  // 🔥 Development mode with Inertia backend (port 3000/5173)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return false
  }

  // Production domains that should use hard reloads for safety on static CDNs
  const staticDomains = ['gravito.dev', 'gravito-framework.github.io']

  // Also check common static hosting patterns
  if (
    hostname.includes('github.io') ||
    hostname.includes('vercel.app') ||
    hostname.includes('netlify.app') ||
    hostname.includes('pages.dev')
  ) {
    return true
  }

  return staticDomains.includes(hostname)
}

const isStatic = isStaticSite()

const linkComponent = computed(() => {
  return isStatic ? 'a' : Link
})

const linkProps = computed(() => {
  if (isStatic) {
    // 在靜態環境中，使用普通的 <a> 標籤
    const { href, class: className, ...rest } = props
    return {
      href,
      class: className,
      ...rest,
    }
  }

  // 在動態環境中，使用 Inertia Link
  return props
})
</script>
