import fs from 'node:fs/promises';
import path from 'node:path';
import { cancel, intro, isCancel, note, outro, select, spinner, text } from '@clack/prompts';
import cac from 'cac';
import { downloadTemplate } from 'giget';
import pc from 'picocolors';

const cli = cac('gravito');

cli.command('create [name]', 'Create a new Gravito project').action(async (name) => {
  console.clear();

  intro(pc.bgBlack(pc.white(' 🌌 Gravito CLI ')));

  const project = await group({
    name: () => {
      if (name) return Promise.resolve(name);
      return text({
        message: 'What is the name of your new universe?',
        placeholder: 'my-galaxy-app',
        defaultValue: 'my-galaxy-app',
        validate: (value) => {
          if (value.length === 0) return 'Name is required!';
          if (/[^a-z0-9-_]/.test(value))
            return 'Name should only contain lowercase letters, numbers, dashes, and underscores.';
          return;
        },
      });
    },
    template: () =>
      select({
        message: 'Pick a starting point:',
        options: [
          { value: 'basic', label: '🪐 Basic Planet (Core + Hono)', hint: 'Minimal setup' },
          // Future templates can serve other options
        ],
      }),
  });

  if (isCancel(project.name) || isCancel(project.template)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const s = spinner();
  s.start('Scaffolding your universe...');

  try {
    // Use giget to download from GitHub
    // Format: github:user/repo/path/to/template
    // We point to the 'templates/basic' folder in our repo
    const templateSource = `github:CarlLee1983/gravito/templates/${project.template}#main`;

    await downloadTemplate(templateSource, {
      dir: project.name,
      force: true, // Allow overwriting empty dir
    });

    s.stop('Universe created!');

    // Update package.json name
    const pkgPath = path.join(process.cwd(), project.name, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    pkg.name = project.name;
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));

    note(`Project: ${project.name}\nTemplate: ${project.template}`, 'Mission Succcessful');

    outro(
      `You're all set! \n\n  cd ${pc.cyan(project.name as string)}\n  bun install\n  bun run dev`
    );
  } catch (err: any) {
    s.stop('Mission Failed');
    console.error(pc.red(err.message));
    process.exit(1);
  }
});

function group(prompts: Record<string, () => Promise<any> | any>) {
  return Object.keys(prompts).reduce(async (promise, key) => {
    const results = await promise;
    const result = await prompts[key]();

    if (isCancel(result)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }

    return { ...results, [key]: result };
  }, Promise.resolve({}));
}

cli.help();
cli.version('0.3.0-alpha.0');

try {
  cli.parse();
} catch (error) {
  console.error(error);
  process.exit(1);
}
