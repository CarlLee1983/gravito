import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

console.log('Building @gravito/freeze-vue...')

// Run tsup build without dts
execSync('tsup', { stdio: 'inherit' })

// Generate minimal .d.ts to prevent TS errors
const dtsContent = `/**
 * @gravito/freeze-vue - Vue.js SSG integration for Gravito
 * @packageDocumentation
 */

import type { DefineComponent, App } from 'vue';
import type { FreezeConfig } from '@gravito/freeze';

export interface FreezeVueConfig extends FreezeConfig {
  autoLink?: boolean;
  linkComponent?: DefineComponent<any>;
  [key: string]: any;
}

export interface StaticLinkProps {
  to: string;
  href?: string;
  [key: string]: any;
}

export const StaticLink: DefineComponent<StaticLinkProps>;
export const FreezeProvider: DefineComponent<{ config?: FreezeVueConfig }>;

export function useFreezeContext(): FreezeConfig;
export function useFreezeLink(href: string): { href: string; isExternal: boolean };
export function useStaticSite(): boolean;
export function setupFreeze(app: App, config?: FreezeVueConfig): void;

export type { FreezeVueConfig, StaticLinkProps };
`

writeFileSync('dist/index.d.ts', dtsContent)

console.log('✅ Build complete with .d.ts stub!')
