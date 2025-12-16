import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface RenderOptions {
  layout?: string;
  scripts?: string;
  title?: string;
  [key: string]: unknown;
}

export class TemplateEngine {
  private cache = new Map<string, string>();
  private viewsDir: string;

  constructor(viewsDir: string) {
    this.viewsDir = viewsDir;
  }

  /**
   * Render a view with optional layout
   */
  public render(
    view: string,
    data: Record<string, unknown> = {},
    options: RenderOptions = {}
  ): string {
    const { layout = 'layout', ...layoutData } = options;

    // 1. Render the main view
    // Merge options into data so they are available in the view too
    const viewContent = this.loadAndInterpolate(view, { ...data, ...layoutData });

    // 2. If no layout, return view content
    if (!layout) {
      return viewContent;
    }

    // 3. Render the layout with injected content
    // We merge data into layout so it can access variables too
    return this.loadAndInterpolate(layout, {
      ...data,
      ...layoutData,
      content: viewContent,
    });
  }

  /**
   * Load template, process includes, and replace {{key}} variables
   */
  private loadAndInterpolate(name: string, data: Record<string, unknown>): string {
    let template = this.readTemplate(name);

    // 1. Process Includes (Recursive)
    template = this.processIncludes(template);

    // 2. Process Loops (Handle arrays)
    template = this.processLoops(template, data);

    // 3. Process Conditionals (Handle if/else/unless)
    template = this.processConditionals(template, data);

    // 4. Interpolate Variables (Final pass)
    return this.interpolate(template, data);
  }

  private readTemplate(name: string): string {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    const path = resolve(this.viewsDir, `${name}.html`);

    if (!existsSync(path)) {
      throw new Error(`View not found: ${path}`);
    }

    const content = readFileSync(path, 'utf-8');

    if (process.env.NODE_ENV === 'production') {
      this.cache.set(name, content);
    }

    return content;
  }

  private processIncludes(template: string, depth = 0): string {
    if (depth > 10) throw new Error('Maximum include depth exceeded');

    return template.replace(/\{\{\s*include\s+['"](.+?)['"]\s*\}\}/g, (_, partialName) => {
      const partialContent = this.readTemplate(partialName);
      return this.processIncludes(partialContent, depth + 1);
    });
  }

  private processLoops(template: string, data: Record<string, unknown>): string {
    // Match {{#each items}}...{{/each}}
    return template.replace(
      /\{\{\s*#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g,
      (_, key, content) => {
        const items = this.getNestedValue(data, key);

        if (!Array.isArray(items) || items.length === 0) {
          return '';
        }

        return items
          .map((item) => {
            // If item is primitive, use {{this}}
            // If item is object, merge it into data scope (simplified scope handling)
            const itemData =
              typeof item === 'object' && item !== null
                ? { ...data, ...(item as object), this: item }
                : { ...data, this: item };

            // Recursively process the inner content (for nested logic)
            let inner = content;
            inner = this.processLoops(inner, itemData); // Nested loops
            inner = this.processConditionals(inner, itemData);
            inner = this.interpolate(inner, itemData);
            return inner;
          })
          .join('');
      }
    );
  }

  private processConditionals(template: string, data: Record<string, unknown>): string {
    // Handle {{#if key}}...{{else}}...{{/if}} and {{#if key}}...{{/if}}
    template = template.replace(
      /\{\{\s*#if\s+([\w.]+)\s*\}\}([\s\S]*?)(\{\{\s*else\s*\}\}([\s\S]*?))?\{\{\s*\/if\s*\}\}/g,
      (_, key, trueBlock, _elseGroup, falseBlock) => {
        const value = this.getNestedValue(data, key);
        return value ? trueBlock : falseBlock || '';
      }
    );

    // Handle {{#unless key}}...{{/unless}}
    template = template.replace(
      /\{\{\s*#unless\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\s*\/unless\s*\}\}/g,
      (_, key, content) => {
        const value = this.getNestedValue(data, key);
        return !value ? content : '';
      }
    );

    return template;
  }

  private interpolate(template: string, data: Record<string, unknown>): string {
    // 1. Handle unescaped variables {{{ value }}}
    template = template.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => {
      const value = this.getNestedValue(data, key);
      return String(value ?? '');
    });

    // 2. Handle escaped variables {{ value }}
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const value = this.getNestedValue(data, key);
      return this.escapeHtml(String(value ?? ''));
    });
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((prev, curr) => {
      // @ts-expect-error: Dynamic access on unknown/any
      return prev ? prev[curr] : undefined;
    }, obj);
  }
}
