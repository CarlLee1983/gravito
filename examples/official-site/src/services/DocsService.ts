import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

// Assuming running from examples/official-site/
// We need to go up two levels to find 'docs'
const DOCS_ROOT = path.resolve(process.cwd(), '../../docs');

export interface DocPage {
  title: string;
  content: string; // HTML
  metadata: Record<string, unknown>;
}

export interface SidebarItem {
  title: string;
  path: string;
  children?: SidebarItem[];
}

export class DocsService {
  /**
   * Get parsed documentation page
   */
  static async getPage(locale: string, slug: string): Promise<DocPage | null> {
    // Handle locale mapping (zh -> zh-TW, en -> en)
    const fsLocale = locale === 'zh' ? 'zh-TW' : 'en';

    // Construct file path: docs/{locale}/{slug}.md
    // Security: Ensure we don't traverse out of allowed paths (simplified for demo)
    const filePath = path.join(DOCS_ROOT, fsLocale, `${slug}.md`);

    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const { data, content } = matter(raw);
      const html = await marked.parse(content);

      return {
        title: (data.title as string) || 'Untitled',
        content: html as string,
        metadata: data as Record<string, unknown>,
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
            plugins: '插件開發',
            api: 'API 參考',
            inertia: 'Orbit Inertia',
          }
        : {
            guide: 'Guide',
            core: 'Core Concepts',
            deploy: 'Deployment',
            plugins: 'Plugin Development',
            api: 'API Reference',
            inertia: 'Orbit Inertia',
          };

    return [
      {
        title: trans.guide,
        path: '#',
        children: [
          { title: trans.core, path: `${prefix}/guide/core-concepts` },
          { title: trans.deploy, path: `${prefix}/guide/deployment` },
          { title: trans.plugins, path: `${prefix}/guide/plugin-development` },
        ],
      },
      {
        title: trans.api,
        path: '#',
        children: [
          { title: trans.inertia, path: `${prefix}/api/orbit-inertia` },
          // { title: 'Orbit DB', path: `${prefix}/api/orbit-db` }, // Future
        ],
      },
    ];
  }
}
