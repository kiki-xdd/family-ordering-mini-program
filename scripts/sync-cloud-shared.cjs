const { copyFileSync, mkdirSync } = require('node:fs');
const { dirname, join } = require('node:path');

const sharedFiles = [
  {
    source: 'cloudfunctions/shared/domain.js',
    targets: [
      'cloudfunctions/getMenu/shared/domain.js'
    ]
  }
];

for (const { source, targets } of sharedFiles) {
  for (const target of targets) {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    console.log(`${source} -> ${target}`);
  }
}
