export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface AlternateUrl {
  lang: string;
  url: string;
}

export interface SitemapImage {
  loc: string;
  title?: string | undefined;
  caption?: string | undefined;
  geo_location?: string | undefined;
  license?: string | undefined;
}

export interface SitemapVideo {
  thumbnail_loc: string;
  title: string;
  description: string;
  content_loc?: string | undefined;
  player_loc?: string | undefined;
  duration?: number | undefined;
  expiration_date?: Date | string | undefined;
  rating?: number | undefined;
  view_count?: number | undefined;
  publication_date?: Date | string | undefined;
  family_friendly?: 'yes' | 'no' | undefined;
  tag?: string[] | undefined;
  category?: string | undefined;
  restriction?:
    | {
        relationship: 'allow' | 'deny';
        countries: string[];
      }
    | undefined;
}

export interface SitemapNews {
  publication: {
    name: string;
    language: string;
  };
  publication_date: Date | string;
  title: string;
  genres?: string | undefined;
  keywords?: string[] | undefined;
  stock_tickers?: string[] | undefined;
}

export interface SitemapEntry {
  url: string;
  lastmod?: Date | string | undefined;
  changefreq?: ChangeFreq | undefined;
  priority?: number | undefined;
  alternates?: AlternateUrl[] | undefined;
  images?: SitemapImage[] | undefined;
  videos?: SitemapVideo[] | undefined;
  news?: SitemapNews | undefined;
}

export interface SitemapIndexEntry {
  url: string;
  lastmod?: Date | string | undefined;
}

export interface SitemapProvider {
  getEntries(): Promise<SitemapEntry[]> | SitemapEntry[] | AsyncIterable<SitemapEntry>;
}

export interface SitemapStreamOptions {
  baseUrl: string;
  pretty?: boolean | undefined;
}

// Phase 4-6: Storage & Cache Interfaces

export interface SitemapStorage {
  write(filename: string, content: string): Promise<void>;
  read(filename: string): Promise<string | null>;
  exists(filename: string): Promise<boolean>;
  getUrl(filename: string): string;
}

export interface SitemapCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
}

export interface SitemapLock {
  acquire(resource: string, ttl: number): Promise<boolean>;
  release(resource: string): Promise<void>;
}
