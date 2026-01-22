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
      return (
        hostname.includes('github.io') ||
        hostname.includes('vercel.app') ||
        hostname.includes('netlify.app') ||
        hostname.includes('pages.dev')
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
