const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'dist');
const dstDir = path.join(__dirname, 'nodejs', 'node_modules', '@app', 'common');
fs.mkdirSync(dstDir, { recursive: true });

for (const f of fs.readdirSync(srcDir)) {
  if (f.endsWith('.js') || f.endsWith('.d.ts')) {
    fs.copyFileSync(path.join(srcDir, f), path.join(dstDir, f));
  }
}