import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

console.log('Building @gravito/freeze...')

// Run tsup build without dts
execSync('tsup', { stdio: 'inherit' })

// Generate minimal .d.ts to prevent TS errors
const dtsContent = `/**
 * @gravito/freeze - Static Site Generation (SSG) core for Gravito
 * @packageDocumentation
 */

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  alternates?: SitemapAlternate[];
}

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

export interface FreezeConfig {
  staticDomains?: string[];
  locales?: string[];
  defaultLocale?: string;
  baseUrl?: string;
  [key: string]: any;
}

export interface RedirectRule {
  from: string;
  to: string;
  status?: number;
}

export interface RedirectInfo {
  from: string;
  to: string;
  status: number;
}

export class FreezeDetector {
  constructor(config?: FreezeConfig);
  isStaticSite(): boolean;
  getLocale(): string;
}

export function defineConfig(config: FreezeConfig): FreezeConfig;
export function defaultConfig(): FreezeConfig;
export function createDetector(config?: FreezeConfig): FreezeDetector;

export function generate404Html(content?: string): string;
export function generateRedirectHtml(to: string): string;
export function generateLocalizedRoutes(
  routes: string[],
  locales: string[],
  defaultLocale: string
): string[];
export function generateRedirects(rules: RedirectRule[]): RedirectInfo[];
export function generateRobotsTxt(
  staticDomains: string[],
  sitemapUrl?: string
): string;
export function generateSitemapEntries(
  routes: string[],
  baseUrl: string,
  locales?: string[]
): SitemapEntry[];
export function generateSitemapXml(entries: SitemapEntry[]): string;
export function inferRedirects(oldRoutes: string[], newRoutes: string[]): RedirectRule[];
export function validateRoutes(routes: string[]): boolean;

export function addLocalePrefix(path: string, locale: string): string;
export function stripLocalePrefix(path: string, locales?: string[]): string;
export function getLocaleFromPath(path: string, locales?: string[]): string | null;
export function getLocalizedPath(path: string, locale: string, locales?: string[]): string;
export function isLocalizedPath(path: string, locales?: string[]): boolean;

export type { SitemapEntry, FreezeConfig, RedirectRule, RedirectInfo };
`

writeFileSync('dist/index.d.ts', dtsContent)

console.log('✅ Build complete with .d.ts stub!')
