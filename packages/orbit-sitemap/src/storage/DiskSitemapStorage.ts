import fs from 'node:fs/promises';
import path from 'node:path';
import type { SitemapStorage } from '../types';

export class DiskSitemapStorage implements SitemapStorage {
  constructor(
    private outDir: string,
    private baseUrl: string
  ) {}

  async write(filename: string, content: string): Promise<void> {
    await fs.mkdir(this.outDir, { recursive: true });
    await fs.writeFile(path.join(this.outDir, filename), content);
  }

  async read(filename: string): Promise<string | null> {
    try {
      return await fs.readFile(path.join(this.outDir, filename), 'utf-8');
    } catch {
      return null;
    }
  }

  async exists(filename: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.outDir, filename));
      return true;
    } catch {
      return false;
    }
  }

  getUrl(filename: string): string {
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const file = filename.startsWith('/') ? filename.slice(1) : filename;
    return `${base}/${file}`;
  }
}
