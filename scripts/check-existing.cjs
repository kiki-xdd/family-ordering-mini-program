const { spawnSync } = require('node:child_process');
const { existsSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

function expandPath(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];

  const files = [];
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      files.push(...expandPath(child));
    } else if (child.endsWith('.js') || child.endsWith('.cjs')) {
      files.push(child);
    }
  }
  return files;
}

const files = process.argv.slice(2).flatMap(expandPath);

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
