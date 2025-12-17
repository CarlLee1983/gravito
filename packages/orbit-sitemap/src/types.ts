export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface AlternateUrl {
  lang: string;
  url: string;
}

export interface SitemapImage {
  loc: string;
  title?: string;
  caption?: string;
  geo_location?: string;
  license?: string;
}

export interface SitemapVideo {
  thumbnail_loc: string;
  title: string;
  description: string;
  content_loc?: string;
  player_loc?: string;
  duration?: number;
  expiration_date?: Date | string;
  rating?: number;
  view_count?: number;
  publication_date?: Date | string;
  family_friendly?: 'yes' | 'no';
  tag?: string[];
  category?: string;
  restriction?: {
    relationship: 'allow' | 'deny';
    countries: string[];
  };
}

export interface SitemapNews {
  publication: {
    name: string;
    language: string;
  };
  publication_date: Date | string;
  title: string;
  genres?: string;
  keywords?: string[];
  stock_tickers?: string[];
}

export interface SitemapEntry {
  url: string;
  lastmod?: Date | string;
  changefreq?: ChangeFreq;
  priority?: number;
  alternates?: AlternateUrl[];
  images?: SitemapImage[];
  videos?: SitemapVideo[];
  news?: SitemapNews;
}

export interface SitemapIndexEntry {
  url: string;
  lastmod?: Date | string;
}

export interface SitemapProvider {
  getEntries(): Promise<SitemapEntry[]> | SitemapEntry[];
}

export interface SitemapStreamOptions {
  baseUrl: string;
  pretty?: boolean;
}
