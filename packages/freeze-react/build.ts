import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

console.log('Building @gravito/freeze-react...')

// Run tsup build without dts
execSync('tsup', { stdio: 'inherit' })

// Generate minimal .d.ts to prevent TS errors
const dtsContent = `/**
 * @gravito/freeze-react - React SSG integration for Gravito
 * @packageDocumentation
 */

import type { ReactNode } from 'react';
import type { FreezeConfig } from '@gravito/freeze';

export interface FreezeReactConfig extends FreezeConfig {
  autoLink?: boolean;
  linkComponent?: React.ComponentType<any>;
  [key: string]: any;
}

export interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
  [key: string]: any;
}

export interface LinkComponentProps {
  to: string;
  href?: string;
  children: ReactNode;
  className?: string;
  [key: string]: any;
}

export const Link: React.ComponentType<LinkProps>;
export const FreezeProvider: React.ComponentType<{ config?: FreezeReactConfig; children: ReactNode }>;

export function useFreezeContext(): FreezeReactConfig;
export function useFreezeLink(href: string): { href: string; isExternal: boolean };
export function useStaticSite(): boolean;

export type { FreezeReactConfig, LinkProps };
`

writeFileSync('dist/index.d.ts', dtsContent)

console.log('✅ Build complete with .d.ts stub!')
