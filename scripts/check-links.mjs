import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const checkedExtensions = new Set(['.astro', '.html', '.jsx', '.tsx']);
const forbiddenLinks = [
  { pattern: /href\s*=\s*["']#["']/g, reason: 'placeholder href is forbidden' },
  { pattern: /href\s*=\s*["']\/(?:login|register)\/?["']/g, reason: 'auth links must use the URL registry' },
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  }));
  return nested.flat();
}

const failures = [];
for (const file of await sourceFiles(sourceRoot)) {
  if (!checkedExtensions.has(extname(file))) continue;
  const source = await readFile(file, 'utf8');
  for (const { pattern, reason } of forbiddenLinks) {
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split('\n').length;
      failures.push(`${relative(sourceRoot, file)}:${line} — ${reason}`);
    }
  }
}

if (failures.length) {
  console.error(`Link policy check failed:\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Link policy check passed.');
}
