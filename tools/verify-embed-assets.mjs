#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const defaultTargets = [
  'backend/internal/web/dist',
  'backend/internal/web/dist-v2',
];

const targets = process.argv.slice(2);
const directories = targets.length > 0 ? targets : defaultTargets;

const errors = [];

const extractAssetRefs = (html) => {
  const refs = [];
  const pattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/g;
  let match = pattern.exec(html);
  while (match) {
    const rawRef = match[1];
    if (rawRef) {
      refs.push(rawRef);
    }
    match = pattern.exec(html);
  }

  return refs;
};

const normalizeAssetPath = (ref) => {
  const cleanRef = ref.split(/[?#]/)[0];

  if (cleanRef.startsWith('/assets/')) {
    return cleanRef.slice(1);
  }
  if (cleanRef.startsWith('assets/')) {
    return cleanRef;
  }
  if (cleanRef.startsWith('/v2/assets/')) {
    return `assets/${cleanRef.slice('/v2/assets/'.length)}`;
  }
  return null;
};

for (const targetDir of directories) {
  const absoluteDir = path.resolve(targetDir);
  const indexPath = path.join(absoluteDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    errors.push(`[${targetDir}] missing index.html`);
    continue;
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  const refs = extractAssetRefs(html);
  const assetPaths = [...new Set(refs.map(normalizeAssetPath).filter(Boolean))];

  if (assetPaths.length === 0) {
    errors.push(`[${targetDir}] no /assets references found in index.html`);
    continue;
  }

  const missing = assetPaths.filter((assetPath) => {
    const resolved = path.join(absoluteDir, assetPath);
    return !fs.existsSync(resolved);
  });

  if (missing.length > 0) {
    for (const item of missing) {
      errors.push(`[${targetDir}] missing asset referenced by index.html: ${item}`);
    }
    continue;
  }

  console.log(`[OK] ${targetDir} (${assetPaths.length} asset refs verified)`);
}

if (errors.length > 0) {
  console.error('\nEmbedded frontend asset verification failed:\n');
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log('\nAll embedded frontend asset references are valid.');
