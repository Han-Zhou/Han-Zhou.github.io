import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve('dist');

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectHtmlFiles(target) : target;
  }));
  return files.flat().filter((file) => file.endsWith('.html'));
}

function outputPathFor(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  if (decoded === '/') return path.join(outputDirectory, 'index.html');
  if (decoded.endsWith('/')) return path.join(outputDirectory, decoded, 'index.html');
  return path.join(outputDirectory, decoded);
}

const missing = [];
const htmlFiles = await collectHtmlFiles(outputDirectory);

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const references = html.matchAll(/(?:href|src)="([^"]+)"/g);

  for (const [, reference] of references) {
    if (reference.startsWith('#') || reference.startsWith('mailto:')) continue;

    const url = new URL(reference, 'https://han-zhou.github.io');
    if (url.origin !== 'https://han-zhou.github.io') continue;

    try {
      await access(outputPathFor(url.pathname));
    } catch {
      missing.push(`${path.relative(outputDirectory, file)} -> ${url.pathname}`);
    }
  }
}

if (missing.length > 0) {
  console.error(`Missing internal targets:\n${missing.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${htmlFiles.length} HTML files: all internal links and assets resolve.`);
}
