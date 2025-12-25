#!/usr/bin/env bun

/**
 * 檢查失敗的套件並診斷問題
 */

import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const FAILED_PACKAGES = [
  'gravito-core',
  '@gravito/luminosity-adapter-photon',
  '@gravito/luminosity-adapter-express',
  '@gravito/luminosity-cli',
];

const PACKAGES_DIR = join(process.cwd(), 'packages');

async function checkFileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function getPackageDir(pkgName: string): Promise<string | null> {
  const dirs = ['core', 'luminosity-adapter-photon', 'luminosity-adapter-express', 'luminosity-cli'];
  const nameMap: Record<string, string> = {
    'gravito-core': 'core',
    '@gravito/luminosity-adapter-photon': 'luminosity-adapter-photon',
    '@gravito/luminosity-adapter-express': 'luminosity-adapter-express',
    '@gravito/luminosity-cli': 'luminosity-cli',
  };

  const dir = nameMap[pkgName] || pkgName.replace('@gravito/', '');
  const pkgPath = join(PACKAGES_DIR, dir);
  
  if (await checkFileExists(join(pkgPath, 'package.json'))) {
    return pkgPath;
  }
  return null;
}

async function diagnosePackage(pkgName: string) {
  console.log(`\n🔍 診斷: ${pkgName}`);
  console.log('─'.repeat(50));

  const pkgDir = await getPackageDir(pkgName);
  if (!pkgDir) {
    console.error(`❌ 找不到套件目錄: ${pkgName}`);
    return;
  }

  const pkgJsonPath = join(pkgDir, 'package.json');
  const pkg = JSON.parse(await readFile(pkgJsonPath, 'utf-8'));

  // 1. 檢查 package.json
  console.log(`✅ package.json 存在`);
  console.log(`   版本: ${pkg.version}`);

  // 2. 檢查 dist 目錄
  const distPath = join(pkgDir, 'dist');
  const hasDist = await checkFileExists(distPath);
  if (hasDist) {
    console.log(`✅ dist 目錄存在`);
  } else {
    console.error(`❌ dist 目錄不存在`);
    console.log(`   💡 執行: cd ${pkgDir} && bun run build`);
  }

  // 3. 檢查 main/module 文件
  if (pkg.main) {
    const mainPath = join(pkgDir, pkg.main.replace(/^\.\//, ''));
    const hasMain = await checkFileExists(mainPath);
    if (hasMain) {
      console.log(`✅ main 文件存在: ${pkg.main}`);
    } else {
      console.error(`❌ main 文件不存在: ${pkg.main}`);
    }
  }

  if (pkg.module) {
    const modulePath = join(pkgDir, pkg.module.replace(/^\.\//, ''));
    const hasModule = await checkFileExists(modulePath);
    if (hasModule) {
      console.log(`✅ module 文件存在: ${pkg.module}`);
    } else {
      console.error(`❌ module 文件不存在: ${pkg.module}`);
    }
  }

  // 4. 檢查 bin（如果有）
  if (pkg.bin) {
    if (typeof pkg.bin === 'object') {
      for (const [key, value] of Object.entries(pkg.bin)) {
        if (typeof value === 'string') {
          const binPath = join(pkgDir, value.replace(/^\.\//, ''));
          const hasBin = await checkFileExists(binPath);
          if (hasBin) {
            console.log(`✅ bin[${key}] 存在: ${value}`);
          } else {
            console.error(`❌ bin[${key}] 不存在: ${value}`);
          }
        }
      }
    }
  }

  // 5. 檢查 prepublishOnly 腳本
  if (pkg.scripts?.prepublishOnly) {
    console.log(`\n🧪 測試 prepublishOnly 腳本...`);
    try {
      await execAsync('bun run prepublishOnly', { cwd: pkgDir });
      console.log(`✅ prepublishOnly 通過`);
    } catch (e: any) {
      console.error(`❌ prepublishOnly 失敗:`);
      console.error(`   ${e.message.split('\n').slice(0, 3).join('\n   ')}`);
    }
  }

  // 6. 測試 dry-run
  console.log(`\n📦 測試 npm publish --dry-run...`);
  try {
    const isBeta = pkg.version.includes('beta');
    const isAlpha = pkg.version.includes('alpha');
    const tag = isBeta ? 'beta' : isAlpha ? 'alpha' : 'latest';
    
    const { stdout, stderr } = await execAsync(
      `npm publish --access public --tag ${tag} --dry-run`,
      { cwd: pkgDir }
    );
    
    if (stdout.includes('+ ' + pkg.name)) {
      console.log(`✅ dry-run 成功`);
    } else {
      console.warn(`⚠️  dry-run 結果異常`);
      console.log(stdout.slice(-200));
    }
  } catch (e: any) {
    console.error(`❌ dry-run 失敗:`);
    const errorMsg = e.message || e.stderr || '';
    console.error(`   ${errorMsg.split('\n').slice(0, 5).join('\n   ')}`);
  }
}

async function main() {
  console.log('🔍 診斷失敗的套件\n');

  for (const pkgName of FAILED_PACKAGES) {
    await diagnosePackage(pkgName);
  }

  console.log('\n' + '='.repeat(50));
  console.log('💡 建議：');
  console.log('1. 確認所有套件都已構建: bun run build');
  console.log('2. 確認 NPM 已登入: npm whoami');
  console.log('3. 手動發布單一套件進行測試');
}

main().catch(console.error);
