import type { SitemapStorage } from '../types';

export class MemorySitemapStorage implements SitemapStorage {
  private files = new Map<string, string>();

  constructor(private baseUrl: string) {}

  async write(filename: string, content: string): Promise<void> {
    this.files.set(filename, content);
  }

  async read(filename: string): Promise<string | null> {
    return this.files.get(filename) || null;
  }

  async exists(filename: string): Promise<boolean> {
    return this.files.has(filename);
  }

  getUrl(filename: string): string {
    // Ensure baseUrl doesn't end with slash and filename doesn't start with slash
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const file = filename.startsWith('/') ? filename.slice(1) : filename;
    return `${base}/${file}`;
  }
}
