// 36s / 128 BPM 高燃电影科技感纯音乐（Apple Pro / Cyberpunk-Minimal 节奏感 + 立体声音乐厅混响）
import fs from 'fs';
import path from 'path';

const SR = 48000;
const DUR = 36.0;
const N = Math.floor(SR * DUR);
const BPM = 128;
const BEAT = 60 / BPM; // 0.46875s

const dryL = new Float32Array(N);
const dryR = new Float32Array(N);
const revL = new Float32Array(N);
const revR = new Float32Array(N);

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

let seed = 98765;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 0xffffffff) * 2 - 1;
}

function mix(i, vl, vr, wet = 0.35) {
  if (i < 0 || i >= N) return;
  dryL[i] += vl; dryR[i] += vr;
  revL[i] += vl * wet; revR[i] += vr * wet;
}

// 1. 结实有弹性的重低音 Punch Kick
function punchKick(t0, gain = 0.88) {
  const s = Math.floor(t0 * SR), len = Math.floor(0.28 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 46 + 155 * Math.exp(-t * 38);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-t * 10.5) * (1 - Math.exp(-t * 500));
    const transient = Math.exp(-t * 240) * 0.38 * Math.sin(2 * Math.PI * 2200 * t);
    const v = Math.tanh((Math.sin(ph) * env + transient) * 1.45) * gain;
    mix(s + i, v, v, 0.08);
  }
}

// 2. 紧致立体声 Clap / Snare
function crispClap(t0, gain = 0.45) {
  const s = Math.floor(t0 * SR), len = Math.floor(0.18 * SR);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const multi = (t < 0.01 ? 1 : 0) + (t > 0.012 && t < 0.022 ? 0.85 : 0) + (t >= 0.022 ? Math.exp(-(t - 0.022) * 24) : 0);
    const nz = rand();
    lp = lp * 0.55 + nz * 0.45;
    const hp = nz - lp;
    const body = Math.sin(2 * Math.PI * 210 * t) * Math.exp(-t * 35) * 0.35;
    const v = (hp * multi * 0.85 + body) * gain;
    mix(s + i, v * 0.94, v * 1.06, 0.32);
  }
}

// 3. 16 分音符律动 Hi-hat
function tightHat(t0, gain = 0.16, open = false, pan = 0) {
  const s = Math.floor(t0 * SR), len = Math.floor((open ? 0.14 : 0.042) * SR);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const nz = rand();
    const hp = nz - prev * 0.93;
    prev = nz;
    const env = Math.exp(-t * (open ? 22 : 95));
    const v = hp * env * gain;
    mix(s + i, v * (1 - pan * 0.5), v * (1 + pan * 0.5), 0.18);
  }
}

// 4. 电影级宽广温暖合成器铜管/弦乐 Pad（带 128 BPM 侧链呼吸）
function cinePad(t0, dur, notes, gain = 0.17, sc = true) {
  const s = Math.floor(t0 * SR), len = Math.floor(dur * SR);
  const freqs = notes.map(mtof);
  for (let i = 0; i < len; i++) {
    const t = i / SR, gt = t0 + t;
    const atk = clamp(t / 0.25, 0, 1);
    const rel = clamp((dur - t) / 0.35, 0, 1);
    let side = 1;
    if (sc) {
      const bp = (gt % BEAT) / BEAT;
      side = 0.28 + 0.72 * Math.pow(bp, 0.48);
    }
    let vl = 0, vr = 0;
    for (let k = 0; k < freqs.length; k++) {
      const f = freqs[k];
      const d1 = 1 + (k % 2 ? 0.003 : -0.003);
      vl += Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t) + 0.14 * Math.sin(2 * Math.PI * f * 3 * t);
      vr += Math.sin(2 * Math.PI * f * d1 * t + 0.5) + 0.32 * Math.sin(2 * Math.PI * f * d1 * 2 * t);
    }
    const env = atk * rel * side * (gain / freqs.length);
    mix(s + i, vl * env, vr * env, 0.55);
  }
}

// 5. 推进感 16 分音符滚动贝斯（Rolling Tech Bass）
function rollBass(t0, dur, midi, gain = 0.34) {
  const s = Math.floor(t0 * SR), len = Math.floor(dur * SR);
  const f = mtof(midi);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = (1 - Math.exp(-t * 280)) * Math.exp(-t * 8.5);
    const bright = Math.exp(-t * 22);
    const v = Math.tanh((Math.sin(2 * Math.PI * f * t) + 0.55 * bright * Math.sin(2 * Math.PI * f * 2 * t) + 0.25 * bright * Math.sin(2 * Math.PI * f * 3 * t)) * 1.5) * env * gain;
    mix(s + i, v, v, 0.12);
  }
}

// 6. 晶莹高频 Pluck 旋律
function crystalPluck(t0, midi, gain = 0.18, pan = 0, dec = 7.5) {
  const s = Math.floor(t0 * SR), len = Math.floor(0.55 * SR);
  const f = mtof(midi);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t * dec) * (1 - Math.exp(-t * 360));
    const br = Math.exp(-t * 18);
    const v = (Math.sin(2 * Math.PI * f * t) + 0.42 * br * Math.sin(2 * Math.PI * f * 2 * t) + 0.18 * br * Math.sin(2 * Math.PI * f * 3 * t)) * env * gain;
    mix(s + i, v * (1 - pan * 0.5), v * (1 + pan * 0.5), 0.52);
  }
}

// 7. 震撼电影重低音冲击（Sub Impact + 空气甩镜 Whoosh）
function subImpact(t0, gain = 0.65) {
  const s = Math.floor(t0 * SR), len = Math.floor(0.85 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (34 + 92 * Math.exp(-t * 14))) / SR;
    const v = Math.tanh(Math.sin(ph) * 1.35) * Math.exp(-t * 4.2) * gain;
    mix(s + i, v, v, 0.35);
  }
}
function whipWhoosh(t0, dur = 0.45, gain = 0.32) {
  const s = Math.floor((t0 - dur * 0.5) * SR), len = Math.floor(dur * SR);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const env = Math.sin(p * Math.PI);
    lp += (0.04 + 0.42 * env * env) * (rand() - lp);
    const v = lp * env * gain;
    mix(s + i, v * (1.2 - p * 0.4), v * (0.8 + p * 0.4), 0.45);
  }
}

/* ==================== 36s / 128 BPM 高燃编曲 ==================== */
const prog = [
  { root: 45, notes: [57, 60, 64, 67, 71] }, // Am9
  { root: 41, notes: [53, 57, 60, 64, 69] }, // Fmaj7
  { root: 48, notes: [55, 60, 64, 67, 74] }, // Cmaj9
  { root: 43, notes: [55, 59, 62, 67, 71] }  // G6
];

// 铺底电影和声（每 4 拍换一次）
for (let bar = 0; bar < 19; bar++) {
  const t = bar * BEAT * 4;
  if (t >= 34.0) break;
  const ch = prog[bar % 4];
  cinePad(t, BEAT * 4.2, ch.notes, t < 3.2 ? 0.14 : 0.19, t >= 3.2);
}

// 128 BPM 高燃律动
const arp = [0, 2, 4, 3, 1, 4, 2, 3];
const totalBeats = Math.floor(33.2 / BEAT);
for (let b = 0; b < totalBeats; b++) {
  const t = b * BEAT;
  const ch = prog[Math.floor(b / 4) % 4];

  // 0-3.2s: 4 记重击开场（紧扣 4 个大字弹射）
  if (t < 3.2) {
    if (b % 2 === 0) {
      punchKick(t, 0.85);
      crystalPluck(t, ch.notes[b % 5] + 12, 0.22, (b % 4 === 0 ? -0.35 : 0.35), 5.0);
    }
    continue;
  }

  // 主体高燃驱动（3.2s - 33.2s）
  const climax = t >= 31.0;
  punchKick(t, climax ? 0.95 : 0.86);
  if (b % 2 === 1) crispClap(t, climax ? 0.52 : 0.42);

  // 16 分音符律动 Hi-hat
  tightHat(t + BEAT * 0.25, 0.10, false, -0.25);
  tightHat(t + BEAT * 0.50, 0.18, b % 4 === 3, 0.22);
  tightHat(t + BEAT * 0.75, 0.12, false, -0.15);

  // 滚动 Tech Bass（每半拍律动）
  rollBass(t, BEAT * 0.48, ch.root, 0.34);
  rollBass(t + BEAT * 0.5, BEAT * 0.45, ch.root + (b % 4 === 3 ? 7 : 0), 0.28);

  // 晶莹 16 分音符高频琶音
  const n1 = ch.notes[arp[(b * 2) % 8]] + 12;
  const n2 = ch.notes[arp[(b * 2 + 1) % 8]] + (climax ? 24 : 12);
  crystalPluck(t, n1, 0.16, -0.45, 8.0);
  crystalPluck(t + BEAT * 0.5, n2, 0.15, 0.45, 8.5);
  if (climax) {
    crystalPluck(t + BEAT * 0.25, ch.notes[4] + 12, 0.14, 0.2, 9.0);
    crystalPluck(t + BEAT * 0.75, ch.notes[3] + 24, 0.14, -0.2, 9.0);
  }
}

// 精准高燃转场冲击音效
subImpact(0.02, 0.65);
subImpact(3.2, 0.60);
whipWhoosh(7.2, 0.45, 0.40);
subImpact(7.2, 0.72);   // 轰穿拱门进入真实 3D 书房一镜到底！
whipWhoosh(12.2, 0.45, 0.34);
whipWhoosh(16.8, 0.45, 0.36);
subImpact(21.2, 0.65);  // 进入 3D 作品广角穹顶
whipWhoosh(25.2, 0.40, 0.34);
subImpact(27.0, 0.62);  // 3D 钛金手机极速翻转
whipWhoosh(31.0, 0.45, 0.38);
subImpact(33.2, 0.78);  // 终极落版 Sub-Drop！
// 落版温暖余韵和弦
crystalPluck(33.25, 57, 0.22, -0.3, 2.0);
crystalPluck(33.36, 64, 0.22, 0.3, 1.9);
crystalPluck(33.48, 69, 0.24, 0, 1.7);
crystalPluck(33.62, 76, 0.20, 0.15, 1.5);

// 紧凑高质量立体声混响
function schroeder(input, dly, g) {
  const out = new Float32Array(N);
  const combs = dly.map((d, idx) => ({ buf: new Float32Array(d), pos: 0, g: g[idx], lp: 0 }));
  for (let i = 0; i < N; i++) {
    const x = input[i];
    let sum = 0;
    for (let c = 0; c < combs.length; c++) {
      const cb = combs[c], y = cb.buf[cb.pos];
      cb.lp = cb.lp * 0.35 + y * 0.65;
      cb.buf[cb.pos] = x + cb.lp * cb.g;
      cb.pos = (cb.pos + 1) % cb.buf.length;
      sum += y;
    }
    out[i] = sum * 0.26;
  }
  return out;
}
const wL = schroeder(revL, [1321, 1489, 1601], [0.76, 0.74, 0.72]);
const wR = schroeder(revR, [1367, 1511, 1637], [0.76, 0.74, 0.72]);

const outDir = 'D:/个人网站/reel/v4-ultimate';
fs.mkdirSync(outDir, { recursive: true });
const wavPath = path.join(outDir, 'score36-v4.wav');
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);

for (let i = 0; i < N; i++) {
  const fadeOut = i > N - SR * 0.6 ? (N - i) / (SR * 0.6) : 1;
  const sl = Math.tanh((dryL[i] + wL[i] * 0.42) * 1.05) * 0.92 * fadeOut;
  const sr = Math.tanh((dryR[i] + wR[i] * 0.42) * 1.05) * 0.92 * fadeOut;
  buf.writeInt16LE(Math.round(clamp(sl, -1, 1) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(clamp(sr, -1, 1) * 32767), 44 + i * 4 + 2);
}
fs.writeFileSync(wavPath, buf);
console.log('V4 128 BPM score ready:', wavPath, (buf.length / 1024 / 1024).toFixed(2) + ' MB');
