import type { SitemapProvider, SitemapStorage, SitemapStreamOptions } from '../types';
import { SitemapIndex } from './SitemapIndex';
import { SitemapStream } from './SitemapStream';

export interface SitemapGeneratorOptions extends SitemapStreamOptions {
  storage: SitemapStorage;
  providers: SitemapProvider[];
  maxEntriesPerFile?: number; // Default 50000
  filename?: string; // Default 'sitemap.xml' (index)
}

export class SitemapGenerator {
  private options: SitemapGeneratorOptions;

  constructor(options: SitemapGeneratorOptions) {
    this.options = {
      maxEntriesPerFile: 50000,
      filename: 'sitemap.xml',
      ...options,
    };
  }

  async run(): Promise<void> {
    let shardIndex = 1;
    let currentCount = 0;
    let currentStream = new SitemapStream({
      baseUrl: this.options.baseUrl,
      pretty: this.options.pretty,
    });

    const index = new SitemapIndex({
      baseUrl: this.options.baseUrl,
      pretty: this.options.pretty,
    });

    const flushShard = async () => {
      if (currentCount === 0) return;

      const baseName = this.options.filename!.replace(/\.xml$/, '');
      const filename = `${baseName}-${shardIndex}.xml`;
      const xml = currentStream.toXML();

      await this.options.storage.write(filename, xml);

      const url = this.options.storage.getUrl(filename);
      // Extract public URL path if possible, or just use absolute URL
      // SitemapIndex usually expects absolute URLs.
      index.add({
        url: url,
        lastmod: new Date(),
      });

      shardIndex++;
      currentCount = 0;
      currentStream = new SitemapStream({
        baseUrl: this.options.baseUrl,
        pretty: this.options.pretty,
      });
    };

    const { providers, maxEntriesPerFile } = this.options;

    for (const provider of providers) {
      const entries = await provider.getEntries();

      // Helper to process a single entry
      const processEntry = async (entry: any) => {
        currentStream.add(entry);
        currentCount++;

        if (currentCount >= maxEntriesPerFile!) {
          await flushShard();
        }
      };

      if (Array.isArray(entries)) {
        for (const entry of entries) {
          await processEntry(entry);
        }
      } else if (entries && typeof (entries as any)[Symbol.asyncIterator] === 'function') {
        for await (const entry of entries as AsyncIterable<any>) {
          await processEntry(entry);
        }
      }
    }

    // Flush remaining
    await flushShard();

    // Write Index
    const indexXml = index.toXML();
    await this.options.storage.write(this.options.filename!, indexXml);
  }
}
