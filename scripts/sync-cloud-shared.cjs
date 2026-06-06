const { copyFileSync, mkdirSync } = require('node:fs');
const { dirname } = require('node:path');

const sharedFiles = [
  {
    source: 'cloudfunctions/shared/domain.js',
    targets: [
      'cloudfunctions/getMenu/shared/domain.js',
      'cloudfunctions/submitOrder/shared/domain.js',
      'cloudfunctions/adminApi/shared/domain.js'
    ]
  },
  {
    source: 'cloudfunctions/shared/adminAuth.js',
    targets: [
      'cloudfunctions/adminLogin/shared/adminAuth.js'
    ]
  },
  {
    source: 'cloudfunctions/shared/push.js',
    targets: [
      'cloudfunctions/submitOrder/shared/push.js',
      'cloudfunctions/adminApi/shared/push.js'
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
