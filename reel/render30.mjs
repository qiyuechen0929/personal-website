import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ROOT = "D:/个人网站/reel";
const URL = "file:///D:/个人网站/reel/reel30.html";
const mode = process.argv[2] || "sheet";
const from = Number(process.argv[3] || 0);
const to = Number(process.argv[4] || 0);

const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--font-render-hinting=none"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(URL, { waitUntil: "load" });
await page.waitForFunction("window.__ready === true", null, { timeout: 120000 });
await page.waitForTimeout(300);

if (mode === "sheet") {
  fs.mkdirSync(path.join(ROOT, "frames"), { recursive: true });
  for (let b = 0; b < 60; b++) {
    const t = b * 0.5 + 0.25;
    await page.evaluate((tt) => window.seek(tt), t);
    await page.screenshot({ path: path.join(ROOT, "frames", `beat_${String(b).padStart(2, "0")}.png`) });
  }
  console.log("beat sheet done");
} else if (mode === "single") {
  const t = Number(process.argv[3] || 0);
  await page.evaluate((tt) => window.seek(tt), t);
  await page.screenshot({ path: path.join(ROOT, "frames", `single_${t.toFixed(2)}.png`) });
  console.log("single", t);
} else if (mode === "full") {
  const dir = path.join(ROOT, "frames", "sub");
  fs.mkdirSync(dir, { recursive: true });
  const total = 1800;
  const t0 = Date.now();
  for (let f = from; f < (to || total); f++) {
    const t = f / 60;
    await page.evaluate((tt) => window.renderFrame(tt, 3), t);
    await page.screenshot({ path: path.join(dir, `s_${String(f).padStart(5, "0")}.png`) });
    if (f % 60 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`frame ${f}/900  ${el.toFixed(0)}s`);
    }
  }
  console.log("full frames done");
} else if (mode === "audio") {
  const b64 = await page.evaluate(async () => {
    const sr = 48000, dur = 30;
    const ac = new OfflineAudioContext(2, sr * dur, sr);
    const rndm = (() => { let s = 12345; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const noise = (() => { const b = ac.createBuffer(1, sr * 2, sr); const ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = rndm() * 2 - 1; return b; })();
    const master = ac.createGain(); master.gain.value = 0.86; master.connect(ac.destination);

    const kick = (at, gain = 1) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(148, at);
      o.frequency.exponentialRampToValueAtTime(44, at + 0.12);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.95 * gain, at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.30);
      o.connect(g).connect(master); o.start(at); o.stop(at + 0.34);
      const n = ac.createBufferSource(); n.buffer = noise;
      const ng = ac.createGain(), hp = ac.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 2600;
      ng.gain.setValueAtTime(0.16 * gain, at);
      ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
      n.connect(hp).connect(ng).connect(master); n.start(at); n.stop(at + 0.05);
    };
    const hat = (at, gain = 0.16, open = false) => {
      const n = ac.createBufferSource(); n.buffer = noise;
      const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 8200; bp.Q.value = 1.2;
      const g = ac.createGain();
      g.gain.setValueAtTime(gain, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + (open ? 0.12 : 0.035));
      n.connect(bp).connect(g).connect(master); n.start(at); n.stop(at + 0.14);
    };
    const sub = (at, freq = 55, len = 0.2, gain = 0.5) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "triangle"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(g).connect(master); o.start(at); o.stop(at + len + 0.02);
    };
    const hit = (at, gain = 0.5) => {
      const n = ac.createBufferSource(); n.buffer = noise;
      const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.setValueAtTime(1800, at);
      bp.frequency.exponentialRampToValueAtTime(140, at + 0.22); bp.Q.value = 0.9;
      const g = ac.createGain();
      g.gain.setValueAtTime(gain, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
      n.connect(bp).connect(g).connect(master); n.start(at); n.stop(at + 0.36);
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(180, at);
      o.frequency.exponentialRampToValueAtTime(58, at + 0.3);
      og.gain.setValueAtTime(0.0001, at);
      og.gain.exponentialRampToValueAtTime(gain * 0.9, at + 0.012);
      og.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      o.connect(og).connect(master); o.start(at); o.stop(at + 0.52);
    };
    const riser = (t0, t1, gain = 0.22) => {
      const n = ac.createBufferSource(); n.buffer = noise; n.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 2.4;
      bp.frequency.setValueAtTime(320, t0);
      bp.frequency.exponentialRampToValueAtTime(7200, t1);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t1 - 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t1);
      n.connect(bp).connect(g).connect(master); n.start(t0); n.stop(t1 + 0.02);
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(110, t0);
      o.frequency.exponentialRampToValueAtTime(880, t1);
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.exponentialRampToValueAtTime(0.07, t1 - 0.05);
      og.gain.exponentialRampToValueAtTime(0.0001, t1);
      o.connect(og).connect(master); o.start(t0); o.stop(t1 + 0.02);
    };

    // 30 拍
    for (let b = 0; b < 60; b++) {
      const at = b * 0.5;
      kick(at, b % 4 === 0 ? 1 : 0.86);
      hat(at + 0.25, b % 2 ? 0.1 : 0.14);
      if (b % 2 === 1) hat(at + 0.125, 0.05);
      if (b % 4 === 0) sub(at, 55, 0.22, 0.42);
      if (b % 8 === 7) hat(at + 0.375, 0.12, true);
    }
    // 十个场景换镜：各一记重音
    [3, 6, 9, 12, 15, 18, 21, 24, 27].forEach((at, i) => hit(at, i === 7 ? 0.66 : 0.44));
    hit(0.0, 0.5);
    // 两段推进：进 LATTICE、进 NAME
    riser(14.0, 14.96, 0.2);
    riser(23.0, 23.96, 0.24);
    riser(26.4, 26.96, 0.2);
    hit(24.0, 0.62);
    hit(27.0, 0.58);
    // 结尾一记最重
    hit(29.0, 0.82);
    kick(29.5, 0.7);
    // 收尾：一声细碎的咔
    (() => {
      const n = ac.createBufferSource(); n.buffer = noise;
      const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 5200;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.12, 29.9); g.gain.exponentialRampToValueAtTime(0.0001, 29.98);
      n.connect(hp).connect(g).connect(master); n.start(29.9); n.stop(29.98);
    })();

    const buf = await ac.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const n = L.length;
    const data = new DataView(new ArrayBuffer(44 + n * 4));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); data.setUint32(4, 36 + n * 4, true); w(8, "WAVE"); w(12, "fmt ");
    data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 2, true);
    data.setUint32(24, sr, true); data.setUint32(28, sr * 4, true); data.setUint16(32, 4, true);
    data.setUint16(34, 16, true); w(36, "data"); data.setUint32(40, n * 4, true);
    let o = 44;
    for (let i = 0; i < n; i++) {
      data.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true); o += 2;
      data.setInt16(o, Math.max(-1, Math.min(1, R[i])) * 32767, true); o += 2;
    }
    const bytes = new Uint8Array(data.buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(bin);
  });
  fs.mkdirSync(path.join(ROOT, "audio"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "audio", "soundtrack30.wav"), Buffer.from(b64, "base64"));
  console.log("audio written");
}

if (errors.length) console.log("PAGE ERRORS:\n" + errors.slice(0, 10).join("\n"));
await browser.close();
