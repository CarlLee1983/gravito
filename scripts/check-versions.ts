#!/usr/bin/env bun

/**
 * 檢查所有套件的版本號和標籤
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PACKAGES_DIR = join(process.cwd(), 'packages');

// 官網使用的套件（Beta）
const OFFICIAL_SITE_PACKAGES = [
  'gravito-core',
  '@gravito/stasis',
  '@gravito/orbit-inertia',
  '@gravito/orbit-view',
  '@gravito/luminosity-adapter-photon',
  '@gravito/luminosity',
];

interface PackageInfo {
  name: string;
  version: string;
  tag: 'beta' | 'alpha' | 'stable';
  isOfficialSite: boolean;
}

async function getPackages(): Promise<PackageInfo[]> {
  const packages: PackageInfo[] = [];
  const dirs = await readdir(PACKAGES_DIR);

  for (const dir of dirs) {
    const pkgPath = join(PACKAGES_DIR, dir, 'package.json');
    try {
      const content = await readFile(pkgPath, 'utf-8');
      const json = JSON.parse(content);

      if (json.private) continue;

      const isOfficialSite = OFFICIAL_SITE_PACKAGES.includes(json.name);
      const version = json.version;
      
      let tag: 'beta' | 'alpha' | 'stable' = 'stable';
      if (version.includes('beta')) {
        tag = 'beta';
      } else if (version.includes('alpha')) {
        tag = 'alpha';
      }

      packages.push({
        name: json.name,
        version,
        tag,
        isOfficialSite,
      });
    } catch (e: any) {
      // 忽略錯誤
    }
  }

  return packages.sort((a, b) => {
    // 先按 tag 排序（beta -> alpha -> stable）
    const tagOrder = { beta: 0, alpha: 1, stable: 2 };
    if (tagOrder[a.tag] !== tagOrder[b.tag]) {
      return tagOrder[a.tag] - tagOrder[b.tag];
    }
    // 再按名稱排序
    return a.name.localeCompare(b.name);
  });
}

async function main() {
  console.log('📦 Gravito 套件版本檢查\n');

  const packages = await getPackages();

  // Beta 版本（官網使用）
  const betaPackages = packages.filter((p) => p.tag === 'beta');
  if (betaPackages.length > 0) {
    console.log('✅ Beta 版本（官網使用的套件）:');
    betaPackages.forEach((pkg) => {
      console.log(`   ${pkg.name.padEnd(35)} ${pkg.version.padEnd(15)} → npm publish --tag beta`);
    });
    console.log('');
  }

  // Alpha 版本
  const alphaPackages = packages.filter((p) => p.tag === 'alpha');
  if (alphaPackages.length > 0) {
    console.log('🔬 Alpha 版本（其他套件）:');
    alphaPackages.forEach((pkg) => {
      console.log(`   ${pkg.name.padEnd(35)} ${pkg.version.padEnd(15)} → npm publish --tag alpha`);
    });
    console.log('');
  }

  // 穩定版本
  const stablePackages = packages.filter((p) => p.tag === 'stable');
  if (stablePackages.length > 0) {
    console.log('📌 穩定版本:');
    stablePackages.forEach((pkg) => {
      console.log(`   ${pkg.name.padEnd(35)} ${pkg.version.padEnd(15)} → npm publish`);
    });
    console.log('');
  }

  // 統計
  console.log('📊 統計:');
  console.log(`   Beta:  ${betaPackages.length} 個套件`);
  console.log(`   Alpha: ${alphaPackages.length} 個套件`);
  console.log(`   Stable: ${stablePackages.length} 個套件`);
  console.log(`   總計: ${packages.length} 個套件`);
}

main().catch(console.error);
