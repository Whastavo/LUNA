import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  fs.readdirSync(dir).forEach((f) => {
    let p = path.join(dir, f);
    if (
      f === 'node_modules' ||
      f === '.git' ||
      f === '.svelte-kit' ||
      f === 'build' ||
      f === 'dist'
    )
      return;
    if (fs.statSync(p).isDirectory()) {
      results = results.concat(walk(p));
    } else if (/\.(ts|js|svelte)$/.test(f)) {
      results.push(p);
    }
  });
  return results;
}

const files = walk('src');
const importedPkgs = new Set();
const missingPkgs = new Set();

const declaredDeps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  'svelte'
]);

files.forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line) => {
    const m = line.match(/(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/);
    if (m) {
      let name = m[1];
      if (!name.startsWith('.') && !name.startsWith('$') && !name.startsWith('node:')) {
        let basePkg = name.startsWith('@')
          ? name.split('/').slice(0, 2).join('/')
          : name.split('/')[0];
        importedPkgs.add(basePkg);
        if (!declaredDeps.has(basePkg)) {
          missingPkgs.add(basePkg);
          console.log(`[MISSING] ${f} imports '${name}' (base: '${basePkg}')`);
        }
      }
    }
  });
});

console.log('\n--- All imported packages ---');
console.log(Array.from(importedPkgs).sort());

console.log('\n--- Missing packages from package.json ---');
console.log(Array.from(missingPkgs).sort());
