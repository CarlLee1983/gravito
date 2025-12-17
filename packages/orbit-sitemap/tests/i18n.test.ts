import { describe, expect, test } from 'bun:test';
import { generateI18nEntries } from '../src/helpers/I18nSitemap';
import { SitemapStream } from '../src/core/SitemapStream';

describe('I18n Sitemap Helper', () => {
    test('it generates entries for all locales', () => {
        const entries = generateI18nEntries('/about', ['en', 'zh'], 'https://site.com');

        expect(entries.length).toBe(2);

        const enEntry = entries.find(e => e.url.includes('/en/about'));
        const zhEntry = entries.find(e => e.url.includes('/zh/about'));

        expect(enEntry).toBeDefined();
        expect(zhEntry).toBeDefined();
        // @ts-ignore
        expect(enEntry.url).toBe('https://site.com/en/about');
    });

    test('it generates correct alternates for each entry', () => {
        const entries = generateI18nEntries('/about', ['en', 'zh'], 'https://site.com');
        const entry = entries[0];

        expect(entry.alternates).toBeDefined();
        // @ts-ignore
        expect(entry.alternates.length).toBe(2);

        // @ts-ignore
        const enAlt = entry.alternates.find(a => a.lang === 'en');
        // @ts-ignore
        const zhAlt = entry.alternates.find(a => a.lang === 'zh');

        expect(enAlt?.url).toBe('https://site.com/en/about');
        expect(zhAlt?.url).toBe('https://site.com/zh/about');
    });
});

describe('Sitemap XML Generation with I18n', () => {
    test('it renders xml with xhtml:link', () => {
        const entries = generateI18nEntries('/docs', ['en', 'zh'], 'https://site.com');

        const stream = new SitemapStream({ baseUrl: 'https://site.com' });
        stream.addAll(entries);

        const xml = stream.toXML();

        // Verify XML content
        expect(xml).toContain('<loc>https://site.com/en/docs</loc>');
        expect(xml).toContain('hreflang="zh"');
        expect(xml).toContain('href="https://site.com/zh/docs"');

        // Ensure namespace is added
        expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    });
});
