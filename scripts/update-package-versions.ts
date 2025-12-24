#!/usr/bin/env bun

/**
 * 更新套件版本號
 * 
 * 官網使用的套件：beta 或穩定版 (1.0.0-beta.1 或 1.0.0)
 * 其他套件：alpha 版本 (1.0.0-alpha.1 或 0.1.0-alpha.1)
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PACKAGES_DIR = join(process.cwd(), 'packages');

const OFFICIAL_SITE_PACKAGES = [
  'gravito-core',
  '@gravito/stasis',
  '@gravito/ion',
  '@gravito/prism',
  '@gravito/luminosity-adapter-hono',
  '@gravito/luminosity',
  '@gravito/atlas',
  '@gravito/plasma',
  '@gravito/pulse',
  'create-gravito-app',
  '@gravito/freeze',
  '@gravito/freeze-react',
  '@gravito/freeze-vue',
  '@gravito/luminosity-adapter-express',
  '@gravito/luminosity-cli',
  '@gravito/horizon',
];

// 版本配置
const VERSION_CONFIG = {
  // 官網與核心工具：beta 版本
  officialSite: '1.0.0-beta.5',
  // 其他實驗性套件：alpha 版本
  others: '1.0.0-alpha.6',
};

interface PackageInfo {
  name: string;
  path: string;
  isOfficialSite: boolean;
  currentVersion: string;
  newVersion: string;
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
      const newVersion = isOfficialSite ? VERSION_CONFIG.officialSite : VERSION_CONFIG.others;

      packages.push({
        name: json.name,
        path: pkgPath,
        isOfficialSite,
        currentVersion: json.version,
        newVersion,
      });
    } catch (e: any) {
      console.warn(`⚠️  無法讀取 ${dir}/package.json:`, e.message);
    }
  }

  return packages;
}

async function updatePackageVersion(pkg: PackageInfo): Promise<boolean> {
  try {
    const content = await readFile(pkg.path, 'utf-8');
    const json = JSON.parse(content);

    // 更新版本
    json.version = pkg.newVersion;

    // 更新內部依賴版本
    const processDeps = (deps: Record<string, string>) => {
      if (!deps) return;
      for (const key of Object.keys(deps)) {
        if (key.startsWith('@gravito/') || key === 'gravito-core') {
          // 查找對應套件的版本
          const depPkg = OFFICIAL_SITE_PACKAGES.includes(key)
            ? VERSION_CONFIG.officialSite
            : VERSION_CONFIG.others;
          deps[key] = depPkg;
        }
      }
    };

    processDeps(json.dependencies);
    processDeps(json.devDependencies);
    processDeps(json.peerDependencies);

    await writeFile(pkg.path, JSON.stringify(json, null, 2) + '\n');
    return true;
  } catch (e: any) {
    console.error(`❌ 更新 ${pkg.name} 失敗:`, e.message);
    return false;
  }
}

async function main() {
  console.log('📦 更新套件版本號\n');

  const packages = await getPackages();

  console.log('📋 版本策略:');
  console.log(`  ✅ 官網使用的套件: ${VERSION_CONFIG.officialSite}`);
  console.log(`  🔬 其他套件: ${VERSION_CONFIG.others}\n`);

  console.log('📋 官網使用的套件（將設為 beta）:');
  const officialPackages = packages.filter((p) => p.isOfficialSite);
  officialPackages.forEach((pkg) => {
    console.log(`  - ${pkg.name}: ${pkg.currentVersion} → ${pkg.newVersion}`);
  });

  console.log('\n📋 其他套件（將設為 alpha）:');
  const otherPackages = packages.filter((p) => !p.isOfficialSite);
  otherPackages.forEach((pkg) => {
    console.log(`  - ${pkg.name}: ${pkg.currentVersion} → ${pkg.newVersion}`);
  });

  console.log('\n🔄 開始更新...\n');

  let successCount = 0;
  let failCount = 0;

  for (const pkg of packages) {
    const success = await updatePackageVersion(pkg);
    if (success) {
      console.log(`  ✅ ${pkg.name} → ${pkg.newVersion}`);
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n✨ 更新完成: ${successCount} 成功, ${failCount} 失敗`);
  console.log('\n💡 下一步:');
  console.log('  1. 檢查版本號是否正確');
  console.log('  2. 構建所有套件: bun run build');
  console.log('  3. 發布套件: bun run publish:all');
}

main().catch((error) => {
  console.error('❌ 發生錯誤:', error);
  process.exit(1);
});

