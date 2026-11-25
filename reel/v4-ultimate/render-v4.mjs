// V4 终极高燃大片 1080p 60fps (2160 帧) 并行合成 + ffmpeg 封装脚本
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const require = createRequire('file:///D:/个人网站/reel/package.json');
const { chromium } = require('playwright');

const ROOT = 'D:/个人网站';
const OUT_DIR = path.join(ROOT, 'reel/v4-ultimate');
const FRAMES_DIR = path.join(OUT_DIR, 'frames');
const WAV_PATH = path.join(OUT_DIR, 'score36-v4.wav');
const FINAL_MP4 = path.join(ROOT, '陈启粤-个人网站V2终极高燃大片-60fps.mp4');
const SHEET_JPG = path.join(OUT_DIR, 'storyboard-v4-36s.jpg');

const FPS = 60;
const DUR = 36;
const TOTAL = FPS * DUR; // 2160 帧 @ 60fps
const WORKERS = 4;

fs.mkdirSync(FRAMES_DIR, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]);
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const url = `http://127.0.0.1:${port}/reel/v4-ultimate/ultimate36.html`;
console.log(`[V4 Render] Compositing ${TOTAL} frames @ 60fps with ${WORKERS} workers...`);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
});

const tStart = Date.now();
let done = 0;

async function worker(wid) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.__ready);
  for (let f = wid; f < TOTAL; f += WORKERS) {
    const t = f / FPS;
    await page.evaluate((time) => window.seekAsync(time), t);
    const fp = path.join(FRAMES_DIR, `f_${String(f).padStart(5, '0')}.jpg`);
    await page.screenshot({ path: fp, type: 'jpeg', quality: 92 });
    done++;
    if (done % 216 === 0 || done === TOTAL) {
      console.log(`  rendered ${done}/${TOTAL} (${((done / TOTAL) * 100).toFixed(0)}%) in ${((Date.now() - tStart) / 1000).toFixed(1)}s`);
    }
  }
  await ctx.close();
}

await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
await browser.close();
srv.close();

console.log('[V4 Encode] Encoding 1080p 60fps MP4...');
execFileSync('ffmpeg', [
  '-y', '-framerate', String(FPS),
  '-i', path.join(FRAMES_DIR, 'f_%05d.jpg'),
  '-i', WAV_PATH,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium',
  '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', '-shortest',
  FINAL_MP4
], { stdio: 'inherit' });

console.log('[V4 Sheet] Building 4x3 storyboard...');
execFileSync('ffmpeg', [
  '-y', '-i', FINAL_MP4,
  '-vf', "select='isnan(prev_selected_t)+gte(t-prev_selected_t,2.95)',scale=480:270,tile=4x3",
  '-frames:v', '1', '-update', '1', '-q:v', '3',
  SHEET_JPG
], { stdio: 'inherit' });

console.log('V4_ULTIMATE_DONE:', FINAL_MP4, (fs.statSync(FINAL_MP4).size / 1024 / 1024).toFixed(2) + ' MB');
