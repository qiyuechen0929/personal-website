// 单进程顺序驱动真实 index.html 的 Three.js 3D 书房（等待入场 flyTo 结束 + 同步 rAF，彻底 0 抖动！）
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire('file:///D:/个人网站/reel/package.json');
const { chromium } = require('playwright');

const OUT_DIR = 'D:/个人网站/reel/v4-ultimate/live3d';
fs.mkdirSync(OUT_DIR, { recursive: true });

const FPS = 15;
const DUR = 14.0;
const TOTAL = FPS * DUR; // 210 帧顺序连贯实景

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8790/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#open-space', { timeout: 15000 });
await page.waitForTimeout(800);
await page.click('#open-space');
await page.waitForFunction(() => window.__room && window.__room.cam && window.__room.camera, { timeout: 20000 });
// 等完进门 2.6s 的 flyTo(HOME) 运镜，绝不和脚本抢相机控制权！
await page.waitForTimeout(3200);
await page.addStyleTag({
  content: '#topbar,#cam-dock,#hint,#dots,#visit-pill,#toast,#tooltip,#help,#panel,#scrim,#wipe,#portal-flash{display:none !important;opacity:0 !important;}'
});

const t0 = Date.now();
for (let f = 0; f < TOTAL; f++) {
  const fp = path.join(OUT_DIR, `live_${String(f).padStart(4, '0')}.jpg`);
  if (fs.existsSync(fp)) continue;
  const t = f / FPS;
  await page.evaluate(async (time) => {
    const R = window.__room;
    const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
    const lerp = (a, b, k) => a + (b - a) * k;
    const remap = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
    const eIO = (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
    const eExpo = (k) => { k = clamp(k); return k === 0 || k === 1 ? k : (k < 0.5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2); };

    let yaw, pitch, radius, tx, ty, tz, fov = 42, dayM = 1.0;
    if (time < 3.0) {
      const p = eExpo(remap(time, 0, 3.0));
      yaw = lerp(0.85, 0.08, p); pitch = lerp(0.82, 0.16, p); radius = lerp(10.6, 3.3, p);
      tx = lerp(-0.4, 0.05, p); ty = lerp(0.9, 1.32, p); tz = lerp(-1.5, -2.95, p);
      fov = lerp(48, 38, p); dayM = 1.0;
    } else if (time < 6.2) {
      const p = eIO(remap(time, 3.0, 6.2));
      yaw = lerp(0.08, 1.32, p); pitch = lerp(0.16, 0.13, p); radius = lerp(3.3, 4.0, p);
      tx = lerp(0.05, -4.3, p); ty = lerp(1.32, 1.62, p); tz = lerp(-2.95, -1.35, p);
      fov = lerp(38, 44, p); dayM = lerp(1.0, 0.45, p);
    } else if (time < 9.5) {
      const p = eExpo(remap(time, 6.2, 9.5));
      yaw = lerp(1.32, -0.25, p); pitch = lerp(0.13, 0.20, p); radius = lerp(4.0, 5.4, p);
      tx = lerp(-4.3, 0.4, p); ty = lerp(1.62, 1.45, p); tz = lerp(-1.35, -2.2, p);
      fov = lerp(44, 40, p); dayM = lerp(0.45, 0.0, p);
    } else if (time < 12.0) {
      const p = eIO(remap(time, 9.5, 12.0));
      yaw = lerp(-0.25, 0.68, p); pitch = lerp(0.20, 0.06, p); radius = lerp(5.4, 4.8, p);
      tx = lerp(0.4, -0.2, p); ty = lerp(1.45, 0.85, p); tz = lerp(-2.2, -1.6, p);
      fov = 42; dayM = 0.0;
    } else {
      const p = eExpo(remap(time, 12.0, 14.0));
      yaw = lerp(0.68, 0.36, p); pitch = lerp(0.06, 0.34, p); radius = lerp(4.8, 9.2, p);
      tx = lerp(-0.2, 0.1, p); ty = lerp(0.85, 1.35, p); tz = lerp(-1.6, -1.6, p);
      fov = lerp(42, 46, p); dayM = lerp(0.0, 0.25, p);
    }

    R.cam.yaw = R.cam.gyaw = yaw;
    R.cam.pitch = R.cam.gpitch = pitch;
    R.cam.radius = R.cam.gradius = radius;
    R.cam.tx = R.cam.gtx = tx;
    R.cam.ty = R.cam.gty = ty;
    R.cam.tz = R.cam.gtz = tz;
    R.camera.fov = fov;
    R.camera.updateProjectionMatrix();
    R.applyDayNight(dayM, time);
    // 严格等待 1 帧 rAF 确保 Three.js 把最新相机位置画到画布上
    await new Promise((r) => requestAnimationFrame(r));
  }, t);

  await page.screenshot({ path: fp, type: 'jpeg', quality: 92 });
  if ((f + 1) % 35 === 0 || f === TOTAL - 1) {
    console.log(`  [Live3D smooth] ${f + 1}/${TOTAL} (${(((f + 1) / TOTAL) * 100).toFixed(0)}%) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}

await browser.close();
console.log('[Live3D smooth] Done 210 rock-steady frames!');
