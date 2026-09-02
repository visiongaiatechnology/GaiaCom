// STATUS: DIAMANT VGT SUPREME
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const assetsDirectory = new URL('../dist/assets/', import.meta.url);
const maximumJavaScriptBytes = 1_600 * 1024;
const maximumJavaScriptGzipBytes = 500 * 1024;
const maximumStylesheetBytes = 320 * 1024;

const entries = await readdir(assetsDirectory, { withFileTypes: true });
const assetFiles = entries.filter((entry) => entry.isFile());
if (assetFiles.length === 0) {
  throw new Error('Bundle budget gate found no production assets.');
}

const violations = [];
const measurements = [];
for (const entry of assetFiles) {
  if (!entry.name.endsWith('.js') && !entry.name.endsWith('.css')) continue;
  const bytes = await readFile(new URL(entry.name, assetsDirectory));
  const gzipBytes = gzipSync(bytes, { level: 9 }).byteLength;
  measurements.push({ name: entry.name, bytes: bytes.byteLength, gzipBytes });

  if (entry.name.endsWith('.js') && bytes.byteLength > maximumJavaScriptBytes) {
    violations.push(`${entry.name}: ${bytes.byteLength} raw JS bytes exceed ${maximumJavaScriptBytes}`);
  }
  if (entry.name.endsWith('.js') && gzipBytes > maximumJavaScriptGzipBytes) {
    violations.push(`${entry.name}: ${gzipBytes} gzip JS bytes exceed ${maximumJavaScriptGzipBytes}`);
  }
  if (entry.name.endsWith('.css') && bytes.byteLength > maximumStylesheetBytes) {
    violations.push(`${entry.name}: ${bytes.byteLength} CSS bytes exceed ${maximumStylesheetBytes}`);
  }
}

measurements.sort((left, right) => right.gzipBytes - left.gzipBytes);
for (const measurement of measurements.slice(0, 5)) {
  console.log(`[BUNDLE] ${measurement.name}: ${measurement.bytes} raw / ${measurement.gzipBytes} gzip bytes`);
}
if (violations.length > 0) {
  throw new Error(`Bundle budget violated:\n${violations.join('\n')}`);
}
console.log('[BUNDLE] PASS: all JavaScript and stylesheet chunks remain inside release budgets');
