import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

// Use import.meta.dirname to be safe relative to this file
// /src/services/DocsService.ts
// -> /src/services (0)
// -> /src (1)
// -> /official-site (2)
// -> /examples (3)
// -> /gravito-core (4)
// -> /gravito-core/docs (Target)
const DOCS_ROOT = path.resolve(import.meta.dirname, '../../../../docs');

export interface DocPage {
  title: string;
  content: string; // HTML
  metadata: Record<string, unknown>;
  toc: TocItem[];
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface SidebarItem {
  title: string;
  path: string;
  children?: SidebarItem[];
}

export class DocsService {
  private static stripLeadingEmoji(value: string): string {
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: Emoji regex
    return value.replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D]+[\s]+/u, '').trim();
  }

  private static stripLeadingEmojiFromHeadingInnerHtml(value: string): string {
    // Headings are typically plain text at the start (e.g. "📚 Title").
    // Keep this conservative: only remove leading emoji + whitespace.
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: Emoji regex
    return value.replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D]+[\s]+/u, '');
  }

  private static decodeHtmlEntities(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'");
  }

  private static stripHtmlTags(value: string): string {
    return value.replace(/<[^>]*>/g, '');
  }

  private static extractAndRemoveLeadingH1(html: string): { html: string; h1Text: string | null } {
    // The docs layout renders the page title already. Strip a leading H1 from the rendered Markdown
    // to avoid duplicated titles, while still allowing authors to keep an H1 in the source Markdown.
    const match = html.match(/^\s*<h1\b[^>]*>([\s\S]*?)<\/h1>\s*/i);
    if (!match) return { html, h1Text: null };

    const innerHtml = match[1] ?? '';
    const h1Text = DocsService.stripLeadingEmoji(
      DocsService.decodeHtmlEntities(DocsService.stripHtmlTags(String(innerHtml))).trim()
    );

    const stripped = html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '');
    return { html: stripped, h1Text: h1Text || null };
  }

  private static slugifyHeading(text: string): string {
    const normalized = text
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, '-')
      .replace(/[^\p{L}\p{N}\u3400-\u9FFF-]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return normalized;
  }

  private static addHeadingIdsAndToc(html: string): { html: string; toc: TocItem[] } {
    const toc: TocItem[] = [];
    const seen = new Map<string, number>();

    const withAnchors = html.replace(
      /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g,
      (full, levelRaw, attrsRaw, innerHtml) => {
        const level = Number(levelRaw);
        if (!Number.isFinite(level) || level < 1 || level > 6) return full;
        if (level === 1) return full;

        const existingIdMatch = String(attrsRaw).match(/\sid="([^"]+)"/);
        const existingClassMatch = String(attrsRaw).match(/\sclass="([^"]+)"/);

        const headingText = DocsService.stripLeadingEmoji(
          DocsService.decodeHtmlEntities(DocsService.stripHtmlTags(String(innerHtml))).trim()
        );

        const base =
          existingIdMatch?.[1] ||
          DocsService.slugifyHeading(headingText) ||
          `section-${toc.length + 1}`;

        const count = (seen.get(base) ?? 0) + 1;
        seen.set(base, count);
        const id = existingIdMatch?.[1] || (count === 1 ? base : `${base}-${count}`);

        if (headingText) {
          toc.push({ id, text: headingText, level });
        }

        const cleanedAttrs = String(attrsRaw)
          .replace(/\sid="[^"]*"/g, '')
          .replace(/\sclass="[^"]*"/g, '');

        const classes = new Set(
          [existingClassMatch?.[1], 'scroll-mt-24']
            .filter(Boolean)
            .flatMap((c) => String(c).split(/\s+/g))
            .filter(Boolean)
        );

        const classAttr = ` class="${Array.from(classes).join(' ')}"`;
        const idAttr = ` id="${id}"`;

        const cleanedInnerHtml = DocsService.stripLeadingEmojiFromHeadingInnerHtml(
          String(innerHtml)
        );
        return `<h${level}${cleanedAttrs}${idAttr}${classAttr}>${cleanedInnerHtml}</h${level}>`;
      }
    );

    return { html: withAnchors, toc };
  }

  /**
   * Get parsed documentation page
   */
  static async getPage(locale: string, slug: string): Promise<DocPage | null> {
    // Handle locale mapping (zh -> zh-TW, en -> en)
    const fsLocale = locale === 'zh' ? 'zh-TW' : 'en';

    // Construct file path: docs/{locale}/{slug}.md
    const filePath = path.join(DOCS_ROOT, fsLocale, `${slug}.md`);

    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const { data, content } = matter(raw);
      const html = (await marked.parse(content)) as string;
      const leading = DocsService.extractAndRemoveLeadingH1(html);
      const processed = DocsService.addHeadingIdsAndToc(leading.html);

      return {
        title: (data.title as string) || leading.h1Text || 'Untitled',
        content: processed.html,
        metadata: data as Record<string, unknown>,
        toc: processed.toc,
      };
    } catch (error) {
      console.error(`[DocsService] Failed to load docs: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Generate sidebar structure (Simplistic hardcoded version for v1)
   * In a real app, this would walk the directory.
   */
  static getSidebar(locale: string): SidebarItem[] {
    const prefix = locale === 'zh' ? '/zh/docs' : '/docs';
    const trans =
      locale === 'zh'
        ? {
            guide: '使用指南',
            core: '核心概念',
            deploy: '部署',
            plugins: '外掛開發',
            marketplace: '外掛市集標準',
            api: 'API 參考',
            auth: 'Orbit Auth',
            cache: 'Orbit Cache',
            db: 'Orbit DB',
            inertia: 'Orbit Inertia',
            session: 'Orbit Session',
            storage: 'Orbit Storage',
          }
        : {
            guide: 'Guide',
            core: 'Core Concepts',
            deploy: 'Deployment',
            plugins: 'Plugin Development',
            marketplace: 'Marketplace Standard',
            api: 'API Reference',
            auth: 'Orbit Auth',
            cache: 'Orbit Cache',
            db: 'Orbit DB',
            inertia: 'Orbit Inertia',
            session: 'Orbit Session',
            storage: 'Orbit Storage',
          };

    return [
      {
        title: trans.guide,
        path: '#',
        children: [
          { title: trans.core, path: `${prefix}/guide/core-concepts` },
          { title: trans.deploy, path: `${prefix}/guide/deployment` },
          { title: trans.plugins, path: `${prefix}/guide/plugin-development` },
          { title: trans.marketplace, path: `${prefix}/guide/marketplace-standard` },
        ],
      },
      {
        title: trans.api,
        path: '#',
        children: [
          { title: trans.session, path: `${prefix}/api/orbit-session` },
          { title: trans.auth, path: `${prefix}/api/orbit-auth` },
          { title: trans.cache, path: `${prefix}/api/orbit-cache` },
          { title: trans.db, path: `${prefix}/api/orbit-db` },
          { title: trans.inertia, path: `${prefix}/api/orbit-inertia` },
          { title: trans.storage, path: `${prefix}/api/orbit-storage` },
        ],
      },
    ];
  }
}
