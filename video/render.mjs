import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
const FF='/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const FPS=30, W=+process.env.WORKERS||4;
const b = await chromium.launch();
async function worker(i, total) {
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + process.cwd() + '/scene.html');
  await p.evaluate(() => window.ready);
  const start = Math.floor(total * i / W), end = Math.floor(total * (i + 1) / W);
  const ff = spawn(FF, ['-loglevel','error','-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p',`parts/p${i}.mp4`]);
  for (let f = start; f < end; f++) {
    await p.evaluate(t => window.render(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - start) % 100 === 0) console.log(`w${i} ${f - start}/${end - start}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
const p0 = await b.newPage(); await p0.goto('file://' + process.cwd() + '/scene.html');
const dur = await p0.evaluate(() => window.DURATION); await p0.close();
const total = Math.round(dur * FPS);
await Promise.all([...Array(W).keys()].map(i => worker(i, total)));
await b.close();
console.log('done', total);
