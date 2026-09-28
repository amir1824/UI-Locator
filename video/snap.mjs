import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const times = process.argv.slice(2).map(Number);
const b = await chromium.launch({ executablePath: undefined });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('console', m => console.log('console:', m.text()));
p.on('pageerror', e => console.log('ERR:', e.message));
await p.goto('file://' + process.cwd() + '/scene.html');
await p.evaluate(() => window.ready);
for (const t of times) {
  await p.evaluate(t => window.render(t), t);
  await p.screenshot({ path: `snaps/t${t}.jpg`, type: 'jpeg', quality: 80 });
}
await b.close();
