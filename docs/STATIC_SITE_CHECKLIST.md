# [Complete] Static Site Development Checklist

Use this checklist when building static websites with Gravito + `@gravito/freeze`.

## Pre-Development

- [ ] Install `@gravito/freeze` (or `freeze-react`/`freeze-vue`)
- [ ] Read [Static Site Development Guide](./en/guide/static-site-development.md)
- [ ] Understand the difference between dynamic and static navigation
- [ ] Know your production domain(s) for configuration

## Development Phase

### Configuration Setup

```typescript
// freeze.config.ts
import { defineConfig } from '@gravito/freeze'

export const freezeConfig = defineConfig({
  staticDomains: ['your-domain.com'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://your-domain.com',
  redirects: [
    { from: '/docs', to: '/en/docs/guide/getting-started' },
  ],
})
```

- [ ] Create `freeze.config.ts` in project root
- [ ] Configure `staticDomains` with production domains
- [ ] Configure `locales` and `defaultLocale`
- [ ] Add all abstract routes to `redirects`
- [ ] Set correct `baseUrl` for production

### React Setup

- [ ] Install `@gravito/freeze-react`
- [ ] Wrap app with `<FreezeProvider config={freezeConfig}>`
- [ ] Replace all `Link` imports with `StaticLink`
- [ ] Use `useFreeze()` hook for locale switching

### Vue Setup

- [ ] Install `@gravito/freeze-vue`
- [ ] Install plugin: `app.use(FreezePlugin, freezeConfig)`
- [ ] Replace all `Link` imports with `StaticLink`
- [ ] Use `useFreeze()` composable for locale switching

### Navigation Components

- [ ] Header/Navbar uses `StaticLink`
- [ ] Footer links use `StaticLink`
- [ ] Mobile menu links use `StaticLink`
- [ ] Language switcher uses `LocaleSwitcher` or `useFreeze().switchLocale()`
- [ ] Logo/home link uses `StaticLink`
- [ ] All internal page links use `StaticLink`

### Build Script

- [ ] `build-static.ts` uses `@gravito/freeze` utilities
- [ ] Uses `generateLocalizedRoutes()` for all routes
- [ ] Uses `generateRedirects()` for abstract routes
- [ ] Uses `generateSitemapEntries()` for sitemap
- [ ] Static HTML generated for each route
- [ ] `404.html` generated with SPA routing script
- [ ] GitHub Pages files created (CNAME, .nojekyll)

## Build Phase

### Build Execution

```bash
bun run build:static
bun run build:preview  # or: bun run preview
```

- [ ] `bun run build:static` succeeds
- [ ] No build errors or warnings
- [ ] Output directory (`dist-static/`) exists

### Output Verification

- [ ] `index.html` exists (redirect to default locale)
- [ ] All route directories have `index.html`
- [ ] Locale directories exist (`/en/`, `/zh/`, etc.)
- [ ] Redirect HTML files exist for abstract routes
- [ ] `404.html` exists
- [ ] `sitemap.xml` exists with i18n alternates
- [ ] `robots.txt` exists
- [ ] `CNAME` file exists (if using custom domain)
- [ ] `.nojekyll` file exists (for GitHub Pages)

## Testing Phase

### Local Testing (Port 4173)

```bash
bun run build:preview
# Visit http://localhost:4173
```

- [ ] `StaticLink` detects static mode (port 4173)
- [ ] Links render as native `<a>` tags
- [ ] No black overlay on navigation
- [ ] Test all navigation links
- [ ] Verify locale switching works
- [ ] Test 404 page for unknown routes
- [ ] Verify assets load correctly (CSS, JS, images)
- [ ] No console errors

### Production Testing

- [ ] Deploy to staging/production
- [ ] `StaticLink` detects production environment
- [ ] All navigation links work
- [ ] Locale switching works
- [ ] 404 page works
- [ ] Abstract route redirects work
- [ ] Sitemap accessible
- [ ] Test on mobile devices

## Documentation

- [ ] `freeze.config.ts` documented
- [ ] Build process documented
- [ ] Deployment steps documented
- [ ] Team members informed about `@gravito/freeze` usage

## Deployment

### GitHub Pages

```yaml
# .github/workflows/deploy.yml
- run: bun run build:static
- uses: peaceiris/actions-gh-pages@v3
```

### Vercel

```json
{ "buildCommand": "bun run build:static", "outputDirectory": "dist-static" }
```

### Netlify

```toml
[build]
command = "bun run build:static"
publish = "dist-static"
```

- [ ] Deployment workflow configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

## Maintenance

- [ ] Update `freeze.config.ts` when adding new domains
- [ ] Update `redirects` when adding new abstract routes
- [ ] Keep `@gravito/freeze` packages updated
- [ ] Monitor for navigation issues

---

## Troubleshooting

### Links don't navigate properly

1. [Complete] Check: Using `StaticLink` from `@gravito/freeze-react` or `@gravito/freeze-vue`?
2. [Complete] Check: App wrapped with `FreezeProvider` or `FreezePlugin` installed?
3. [Complete] Check: Production domain in `staticDomains` config?

### Black overlay on navigation

1. [Complete] Check: Using Inertia's `Link` instead of `StaticLink`?
2. [Complete] Check: Preview on port 4173?

### Locale not detected

1. [Complete] Check: Path has locale prefix (`/en/`, `/zh/`)?
2. [Complete] Check: Using `getLocalizedPath()` for all links?

### 404 on abstract routes

1. [Complete] Check: Route added to `redirects` in config?
2. [Complete] Check: Redirect HTML generated?

---

## Golden Rules

1. **Always use `StaticLink`** - Never use Inertia's `Link` directly
2. **Always localize paths** - Use `getLocalizedPath()` 
3. **Always test before deploy** - Run `bun run build:preview`
4. **Always configure redirects** - Add abstract routes to config

---

> **Remember**: Use `@gravito/freeze` packages for a consistent SSG experience!
