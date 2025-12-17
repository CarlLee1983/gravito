import { PlanetCore, type GravitoConfig } from 'gravito-core';
import { I18nOrbit } from '@gravito/orbit-i18n';
import { ContentOrbit } from '@gravito/orbit-content';
import { localeMiddleware } from '@gravito/orbit-i18n';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Load Translations (Mock for now)
const translations = {
    en: { "hero.title": "Gravito Framework", "nav.switch": "中文" },
    zh: { "hero.title": "Gravito 框架", "nav.switch": "English" }
};

// Dynamic Content Path Logic (Dev vs Docker vs Root)
const isSiteRoot = process.cwd().endsWith('site');
const contentPath = isSiteRoot ? 'resources/content/docs' : 'packages/site/resources/content/docs';

const config: GravitoConfig = {
    orbits: [
        new I18nOrbit({
            defaultLocale: 'en',
            supportedLocales: ['en', 'zh'],
            translations
        }),
        new ContentOrbit({
            root: process.cwd(),
            collections: {
                docs: { path: contentPath }
            }
        })
    ]
};

export const app = await PlanetCore.boot(config);

// SEO & I18n Routing
app.router.prefix('/:locale').middleware(localeMiddleware).group((router) => {

    // Landing Page
    router.get('/', async (c) => {
        const i18n = c.get('i18n');
        const lang = i18n.locale;

        return c.html(`
            <!DOCTYPE html>
            <html lang="${lang}">
            <head>
                <title>Gravito - Agentic AI Framework</title>
                <meta name="description" content="The future of web development.">
            </head>
            <body>
                <h1>${i18n.t('hero.title')}</h1>
                <nav>
                    <a href="/${lang}/docs/intro">Documentation</a> | 
                    <a href="/${lang === 'en' ? 'zh' : 'en'}">${i18n.t('nav.switch')}</a>
                </nav>
            </body>
            </html>
        `);
    });

    // Docs Page with Full SEO
    router.get('/docs/:slug', async (c) => {
        const content = c.get('content');
        const i18n = c.get('i18n');
        const slug = c.req.param('slug');
        const locale = i18n.locale;

        const doc = await content.find('docs', slug, locale);

        if (!doc) {
            return c.text('Not Found', 404);
        }

        const gaId = process.env.GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
        const baseUrl = 'https://gravito.dev';
        const url = `${baseUrl}/${locale}/docs/${slug}`;
        const imageUrl = `${baseUrl}/og-image.jpg`; // Placeholder

        return c.html(`
            <!DOCTYPE html>
            <html lang="${locale}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <!-- Primary Meta Tags -->
                <title>${doc.meta.title} | Gravito</title>
                <meta name="title" content="${doc.meta.title} | Gravito">
                <meta name="description" content="${doc.meta.description}">
                <link rel="canonical" href="${url}">

                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="article">
                <meta property="og:url" content="${url}">
                <meta property="og:title" content="${doc.meta.title} | Gravito">
                <meta property="og:description" content="${doc.meta.description}">
                <meta property="og:image" content="${imageUrl}">
                <meta property="og:site_name" content="Gravito">
                <meta property="og:locale" content="${locale === 'en' ? 'en_US' : 'zh_TW'}">

                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:url" content="${url}">
                <meta property="twitter:title" content="${doc.meta.title} | Gravito">
                <meta property="twitter:description" content="${doc.meta.description}">
                <meta property="twitter:image" content="${imageUrl}">

                <!-- Google Analytics -->
                <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
                <script>
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                </script>
            </head>
            <body>
                <nav>
                    <a href="/${locale === 'en' ? 'zh' : 'en'}/docs/${slug}">
                        ${locale === 'en' ? '中文' : 'English'}
                    </a>
                </nav>
                <article>
                    ${doc.body}
                </article>
            </body>
            </html>
        `);
    });

});

// Root redirect
app.app.get('/', (c) => c.redirect('/en'));

// Liveness Probe
app.app.get('/health', (c) => c.text('OK'));

// Conditional Start (Only if run directly via bun run)
if (import.meta.main) {
    app.liftoff(3000);
}

// Default export for testing or library usage
export default {
    port: 3000,
    fetch: app.app.fetch
};
