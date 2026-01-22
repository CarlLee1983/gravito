<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  let { href, className = '' }: { href: string; className?: string } = $props()

  function isStaticSite(): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    const hostname = window.location.hostname
    const port = window.location.port

    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '4173') {
      return true
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false
    }

    const staticDomainsEnv = import.meta.env.VITE_STATIC_SITE_DOMAINS || ''
    const staticDomains = staticDomainsEnv
      .split(',')
      .map((d: string) => d.trim())
      .filter((d: string) => d.length > 0)

    if (staticDomains.length === 0) {
      // 使用 endsWith 而不是 includes 以避免 URL substring sanitization 漏洞
      return (
        hostname.endsWith('.github.io') ||
        hostname.endsWith('.vercel.app') ||
        hostname.endsWith('.netlify.app') ||
        hostname.endsWith('.pages.dev')
      )
    }

    return staticDomains.includes(hostname)
  }

  const isStatic = isStaticSite()
</script>

{#if isStatic}
  <a {href} class={className}>
    <slot />
  </a>
{:else}
  <Link {href} class={className}>
    <slot />
  </Link>
{/if}
