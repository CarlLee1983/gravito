
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const PACKAGES_DIR = join(process.cwd(), 'packages');
const TARGET_VERSION = '1.0.0';

async function main() {
    const packages = await readdir(PACKAGES_DIR);

    // 1. Update Versions
    console.log(`📦 Updating all packages to version ${TARGET_VERSION}...`);

    for (const pkg of packages) {
        const pkgPath = join(PACKAGES_DIR, pkg, 'package.json');
        try {
            const content = await readFile(pkgPath, 'utf-8');
            const json = JSON.parse(content);

            if (json.private) continue;

            json.version = TARGET_VERSION;

            // Update deps
            const processDeps = (deps: Record<string, string>) => {
                if (!deps) return;
                for (const key of Object.keys(deps)) {
                    if (key.startsWith('@gravito/') || key === 'gravito-core') {
                        deps[key] = TARGET_VERSION; // Use exact version for internal deps
                    }
                }
            };

            processDeps(json.dependencies);
            processDeps(json.devDependencies);
            processDeps(json.peerDependencies);

            await writeFile(pkgPath, JSON.stringify(json, null, 4) + '\n');
            console.log(`  ✅ Updated ${json.name}`);
        } catch (e: any) {
            console.warn(`  ⚠️  Skipping ${pkg}:`, e.message);
        }
    }

    console.log('✨ Versions updated to 1.0.0 locally.');
    console.log('👉 Next step: Run "bun run build" to verify builds, then publish manually.');
}

main().catch(console.error);
