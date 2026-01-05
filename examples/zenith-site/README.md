# 🌐 Gravito Static Site

A pre-configured static site template built with Gravito + Inertia.js, ready for deployment to GitHub Pages, Vercel, Netlify, and other static hosting platforms.

## ✨ Features

- ✅ **StaticLink Component** - Automatically handles navigation in static vs dynamic environments
- ✅ **Pre-configured Build Script** - Ready-to-use static site generation
- ✅ **Framework Support** - Choose between React or Vue during setup
- ✅ **Environment-based Configuration** - Configure production domains via environment variables
- ✅ **SPA Routing Support** - Includes 404.html with SPA routing for GitHub Pages
- ✅ **Best Practices** - Follows all static site development standards

## 🚀 Quick Start

### 1. Create Project

```bash
gravito create my-static-site --template static-site
```

The CLI will ask you to choose between React or Vue.

### 2. Configure Environment

Copy `env.example` to `.env` and update:

```env
STATIC_SITE_DOMAINS=yourdomain.com,www.yourdomain.com
STATIC_SITE_BASE_URL=https://yourdomain.com
```

### 3. Install Dependencies

```bash
cd my-static-site
bun install
```

### 4. Start Development

```bash
bun run dev
```

Visit http://localhost:3000

### 5. Build Static Site

```bash
bun run build:static
```

The static files will be generated in `dist-static/` directory.

### 6. Preview Static Site

```bash
bun run preview:static
```

Or manually:

```bash
cd dist-static
npx serve .
```

## 📁 Project Structure

```
src/
├── bootstrap.ts          # Application bootstrap
├── index.ts              # Entry point
├── routes/               # Route definitions
├── controllers/          # Controllers
├── hooks/                # Application hooks
├── views/                # Server-side templates
└── client/               # Frontend code
    ├── app.tsx           # React entry (or app.vue.ts for Vue)
    ├── components/
    │   ├── StaticLink.tsx  # React StaticLink (or .vue)
    │   └── Layout.tsx      # Layout component
    ├── pages/             # Page components
    └── styles.css         # Global styles
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
# Static Site Configuration
STATIC_SITE_DOMAINS=yourdomain.com,www.yourdomain.com
STATIC_SITE_BASE_URL=https://yourdomain.com

# Development
NODE_ENV=development
PORT=3000
```

**Important**: For Vite to access these variables in client code, prefix them with `VITE_`:

```env
VITE_STATIC_SITE_DOMAINS=yourdomain.com,www.yourdomain.com
```

The build script will automatically inject these into the client bundle.

### StaticLink Component

The `StaticLink` component automatically:

- Uses full page navigation (`<a>` tag) in static environments
- Uses Inertia navigation (`Link` component) in development
- Detects environment based on `VITE_STATIC_SITE_DOMAINS` or common static hosting patterns

**Usage:**

```tsx
// React
import { StaticLink } from '@/components/StaticLink'
<StaticLink href="/about">About</StaticLink>

// Vue
<StaticLink href="/about">About</StaticLink>
```

## 🏗️ Building

### Build Client Assets

```bash
bun run build:client
```

### Build Static Site

```bash
bun run build:static
```

This will:

1. Build client assets (Vite)
2. Generate static HTML for all routes
3. Generate `404.html` with SPA routing support
4. Copy static assets
5. Generate sitemap.xml
6. Create GitHub Pages files (CNAME, .nojekyll)

### Output

All static files are generated in `dist-static/` directory:

```
dist-static/
├── index.html
├── about/
│   └── index.html
├── 404.html
├── sitemap.xml
├── CNAME
├── .nojekyll
└── static/
    └── build/
        └── assets/
```

## 🚢 Deployment

### GitHub Pages

1. Build static site: `bun run build:static`
2. Commit `dist-static/` to `gh-pages` branch
3. Configure GitHub Pages to serve from `gh-pages` branch

### Vercel

1. Build: `bun run build:static`
2. Output directory: `dist-static`
3. Deploy via Vercel CLI or Git integration

### Netlify

1. Build: `bun run build:static`
2. Publish directory: `dist-static`
3. Deploy via Netlify CLI or Git integration

## 📚 Documentation

- [Static Site Development Guide](../../docs/en/guide/static-site-development.md)
- [Static Site Checklist](../../docs/STATIC_SITE_CHECKLIST.md)
- [Quick Reference](../../docs/STATIC_SITE_QUICK_REFERENCE.md)

## ⚠️ Important Notes

1. **Always use StaticLink** - Never use Inertia's `Link` directly in static sites
2. **Configure domains** - Update `STATIC_SITE_DOMAINS` with your production domains
3. **Test locally** - Always test static build locally before deploying
4. **Environment variables** - Use `VITE_` prefix for client-side variables

## 🆘 Troubleshooting

### Links don't navigate

- Check: Are you using `StaticLink` instead of Inertia's `Link`?
- Check: Is `VITE_STATIC_SITE_DOMAINS` configured correctly?

### 404 page doesn't work

- Check: Is `404.html` generated in `dist-static/`?
- Check: Does it contain the SPA routing script?

### Assets don't load

- Check: Are static assets copied to `dist-static/static/`?
- Check: Are asset paths correct in generated HTML?

## 📝 License

MIT

