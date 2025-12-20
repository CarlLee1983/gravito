export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface AlternateUrl {
  lang: string
  url: string
}

export interface SitemapImage {
  loc: string
  title?: string | undefined
  caption?: string | undefined
  geo_location?: string | undefined
  license?: string | undefined
}

export interface SitemapVideo {
  thumbnail_loc: string
  title: string
  description: string
  content_loc?: string | undefined
  player_loc?: string | undefined
  duration?: number | undefined
  expiration_date?: Date | string | undefined
  rating?: number | undefined
  view_count?: number | undefined
  publication_date?: Date | string | undefined
  family_friendly?: 'yes' | 'no' | undefined
  tag?: string[] | undefined
  category?: string | undefined
  restriction?:
    | {
        relationship: 'allow' | 'deny'
        countries: string[]
      }
    | undefined
}

export interface SitemapNews {
  publication: {
    name: string
    language: string
  }
  publication_date: Date | string
  title: string
  genres?: string | undefined
  keywords?: string[] | undefined
  stock_tickers?: string[] | undefined
}

export interface SitemapEntry {
  url: string
  lastmod?: Date | string | undefined
  changefreq?: ChangeFreq | undefined
  priority?: number | undefined
  alternates?: AlternateUrl[] | undefined
  images?: SitemapImage[] | undefined
  videos?: SitemapVideo[] | undefined
  news?: SitemapNews | undefined
  // 301 轉址支援
  redirect?: {
    from: string // 原始 URL（如果這是轉址後的 URL）
    to: string // 目標 URL（如果這是轉址前的 URL）
    type: 301 | 302
    canonical?: string // Canonical URL
  }
}

export interface SitemapIndexEntry {
  url: string
  lastmod?: Date | string | undefined
}

export interface SitemapProvider {
  getEntries(): Promise<SitemapEntry[]> | SitemapEntry[] | AsyncIterable<SitemapEntry>
}

export interface SitemapStreamOptions {
  baseUrl: string
  pretty?: boolean | undefined
}

// Phase 4-6: Storage & Cache Interfaces

export interface SitemapStorage {
  write(filename: string, content: string): Promise<void>
  read(filename: string): Promise<string | null>
  exists(filename: string): Promise<boolean>
  getUrl(filename: string): string
  // 影子處理相關方法
  writeShadow?(filename: string, content: string, shadowId?: string): Promise<void>
  commitShadow?(shadowId: string): Promise<void>
  listVersions?(filename: string): Promise<string[]>
  switchVersion?(filename: string, version: string): Promise<void>
}

export interface SitemapCache {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  has(key: string): Promise<boolean>
}

export interface SitemapLock {
  acquire(resource: string, ttl: number): Promise<boolean>
  release(resource: string): Promise<void>
}

// 進度追蹤介面
export interface SitemapProgress {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total: number
  processed: number
  percentage: number
  startTime?: Date
  endTime?: Date
  error?: string
}

export interface SitemapProgressStorage {
  get(jobId: string): Promise<SitemapProgress | null>
  set(jobId: string, progress: SitemapProgress): Promise<void>
  update(jobId: string, updates: Partial<SitemapProgress>): Promise<void>
  delete(jobId: string): Promise<void>
  list(limit?: number): Promise<SitemapProgress[]>
}

// 變更追蹤介面
export type ChangeType = 'add' | 'update' | 'remove'

export interface SitemapChange {
  type: ChangeType
  url: string
  entry?: SitemapEntry
  timestamp: Date
}

export interface ChangeTracker {
  track(change: SitemapChange): Promise<void>
  getChanges(since?: Date): Promise<SitemapChange[]>
  getChangesByUrl(url: string): Promise<SitemapChange[]>
  clear(since?: Date): Promise<void>
}

// 轉址相關介面
export interface RedirectRule {
  from: string
  to: string
  type: 301 | 302
  createdAt?: Date
}

export interface RedirectManager {
  register(redirect: RedirectRule): Promise<void>
  registerBatch(redirects: RedirectRule[]): Promise<void>
  get(from: string): Promise<RedirectRule | null>
  getAll(): Promise<RedirectRule[]>
  resolve(url: string, followChains?: boolean, maxChainLength?: number): Promise<string | null>
}
