// Build: bundle, measure, stamp, gate.
//
// The size budget is not decoration. If the gzipped bundle exceeds BUDGET the
// build exits non-zero, so CI fails and the claim on the page can never drift
// from the truth. The measured number is stamped into the HTML at build time
// rather than typed in by hand, for the same reason.

import * as esbuild from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BUDGET = 50 * 1024; // 50 KB gzipped, JS only
const OUT = 'docs';

mkdirSync(OUT, { recursive: true });

const result = await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  outfile: `${OUT}/app.js`,
  legalComments: 'none',
  metafile: true,
});

if (result.errors.length) process.exit(1);

const js = readFileSync(`${OUT}/app.js`);
const gz = gzipSync(js, { level: 9 }).length;
const cssRaw = readFileSync('src/styles.css');
writeFileSync(`${OUT}/styles.css`, cssRaw);
const cssGz = gzipSync(cssRaw, { level: 9 }).length;

let commit = 'local';
try {
  commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  /* first build, before the first commit */
}

// Stamp the real numbers into the shell.
const html = readFileSync('src/index.html', 'utf8')
  .replaceAll('%JS_GZIP%', String(gz))
  .replaceAll('%JS_RAW%', String(js.length))
  .replaceAll('%CSS_GZIP%', String(cssGz))
  .replaceAll('%BUDGET%', String(BUDGET))
  .replaceAll('%COMMIT%', commit)
  .replaceAll('%DEPS%', '0');

writeFileSync(`${OUT}/index.html`, html);
writeFileSync(`${OUT}/.nojekyll`, '');

for (const asset of ['share-card.svg', 'favicon.svg']) {
  if (existsSync(`src/assets/${asset}`)) copyFileSync(`src/assets/${asset}`, `${OUT}/${asset}`);
}

const pct = ((gz / BUDGET) * 100).toFixed(1);
console.log(`js   ${js.length} raw / ${gz} gzip  (${pct}% of ${BUDGET} budget)`);
console.log(`css  ${cssRaw.length} raw / ${cssGz} gzip`);

if (gz > BUDGET) {
  console.error(`\nOVER BUDGET by ${gz - BUDGET} bytes gzipped. Failing the build.`);
  process.exit(1);
}
