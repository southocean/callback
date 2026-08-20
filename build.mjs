// Build: bundle, split, measure, stamp, gate.
//
// The size budget is not decoration. If the entry bundle exceeds BUDGET the
// build exits non-zero, so CI fails and the number printed on the page can
// never drift from the truth. The measured value is stamped into the HTML at
// build time rather than typed in by hand, for the same reason.
//
// Code splitting is on: the dev portal is reachable only by the Konami code, so
// it is a separate chunk that nobody who does not find it ever downloads.

import * as esbuild from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BUDGET = 50 * 1024; // gzipped, entry bundle only
const OUT = 'docs';

mkdirSync(OUT, { recursive: true });

// Chunk names are content-hashed, so old ones would pile up in the committed
// build and get served forever. Clear them first.
for (const f of readdirSync(OUT)) {
  if (f.startsWith('chunk-') && f.endsWith('.js')) rmSync(`${OUT}/${f}`);
}

const result = await esbuild.build({
  entryPoints: { app: 'src/main.ts' },
  bundle: true,
  splitting: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  outdir: OUT,
  entryNames: '[name]',
  chunkNames: 'chunk-[hash]',
  legalComments: 'none',
  metafile: true,
});

if (result.errors.length) process.exit(1);

const gz = (buf) => gzipSync(buf, { level: 9 }).length;

const entry = readFileSync(`${OUT}/app.js`);

// Splitting factors shared code into chunks, and most of those are pulled in
// immediately by the entry — only the ones behind a dynamic import are truly
// deferred. The number printed on the page is the INITIAL payload, so walk the
// metafile's static import graph rather than guessing from filenames.
const outputs = result.metafile.outputs;
const staticGraph = new Set();
const walk = (file) => {
  if (staticGraph.has(file)) return;
  staticGraph.add(file);
  for (const imp of outputs[file]?.imports ?? []) {
    if (imp.kind === 'import-statement') walk(imp.path);
  }
};
walk(`${OUT}/app.js`);

const sizeOf = (file) => gz(readFileSync(file));
const entryGz = [...staticGraph].reduce((a, f) => a + sizeOf(f), 0);

const deferred = readdirSync(OUT)
  .filter((f) => f.startsWith('chunk-') && f.endsWith('.js'))
  .filter((f) => !staticGraph.has(`${OUT}/${f}`))
  .map((f) => ({ f, gz: sizeOf(`${OUT}/${f}`) }));
const chunkGz = deferred.reduce((a, c) => a + c.gz, 0);

const cssRaw = readFileSync('src/styles.css');
writeFileSync(`${OUT}/styles.css`, cssRaw);
const cssGz = gz(cssRaw);

let commit = 'local';
try {
  commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  /* first build, before the first commit */
}

const html = readFileSync('src/index.html', 'utf8')
  .replaceAll('%JS_GZIP%', String(entryGz))
  .replaceAll('%JS_RAW%', String(entry.length))
  .replaceAll('%CSS_GZIP%', String(cssGz))
  .replaceAll('%BUDGET%', String(BUDGET))
  .replaceAll('%COMMIT%', commit)
  .replaceAll('%DEPS%', '0');

writeFileSync(`${OUT}/index.html`, html);
writeFileSync(`${OUT}/.nojekyll`, '');

for (const asset of ['share-card.svg', 'favicon.svg', 'meet-mark.png', 'meet-google.png']) {
  if (existsSync(`src/assets/${asset}`)) copyFileSync(`src/assets/${asset}`, `${OUT}/${asset}`);
}

// Self-hosted fonts. Already woff2 and already subset, so they are copied
// rather than processed — and they are the reason the icons are the real
// Material Symbols rather than my tracings of them.
mkdirSync(`${OUT}/fonts`, { recursive: true });
let fontBytes = 0;
for (const f of readdirSync('src/assets/fonts')) {
  copyFileSync(`src/assets/fonts/${f}`, `${OUT}/fonts/${f}`);
  fontBytes += statSync(`src/assets/fonts/${f}`).size;
}

const pct = ((entryGz / BUDGET) * 100).toFixed(1);
console.log(`initial  ${entryGz} gzip across ${staticGraph.size} file(s)   (${pct}% of ${BUDGET} budget)`);
for (const c of deferred) console.log(`deferred ${c.f} — ${c.gz} gzip, fetched only when reached`);
console.log(`css      ${cssGz} gzip`);
console.log(`fonts    ${fontBytes} bytes self-hosted woff2 (already compressed)`);
console.log(`worst    ${entryGz + chunkGz + cssGz} gzip if every deferred chunk is also fetched`);

if (entryGz > BUDGET) {
  console.error(`\nOVER BUDGET by ${entryGz - BUDGET} bytes gzipped. Failing the build.`);
  process.exit(1);
}
