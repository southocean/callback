// CI entry point. Same suite the browser runs — see the note at the top of
// suite.ts. Exits non-zero on any failure so the workflow goes red.

import { run } from './suite.js';

const results = await run(process.argv.includes('--chaos'));
const failed = results.filter((r) => !r.pass);
let suite = '';

for (const r of results) {
  if (r.suite !== suite) {
    suite = r.suite;
    console.log(`\n  ${suite}`);
  }
  console.log(`    ${r.pass ? 'ok  ' : 'FAIL'} ${r.name}`);
  if (!r.pass) console.log(`         ${(r.error ?? '').split('\n').join('\n         ')}`);
}

const ms = results.reduce((a, r) => a + r.ms, 0);
console.log(`\n  ${results.length - failed.length}/${results.length} passing (${ms.toFixed(0)}ms)\n`);

if (failed.length) process.exit(1);
