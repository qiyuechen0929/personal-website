// 30s 音轨：120 BPM / A 小调 / 侧链 / 16 分 hats / 三音动机
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ROOT = "D:/个人网站/reel";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");

const b64 = await page.evaluate(async () => {
  const sr = 48000, dur = 30;
  const ac = new OfflineAudioContext(2, sr * dur, sr);
  const rnd = (() => { let s = 20260217; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  const noiseBuf = (() => {
    const b = ac.createBuffer(2, sr * 2, sr);
    for (let c = 0; c < 2; c++) { const ch = b.getChannelData(c); for (let i = 0; i < ch.length; i++) ch[i] = rnd() * 2 - 1; }
    return b;
  })();
  const noise = () => { const n = ac.createBufferSource(); n.buffer = noiseBuf; return n; };

  /* ---------------- 母线 ---------------- */
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3.2;
  comp.attack.value = 0.006; comp.release.value = 0.18;
  const master = ac.createGain(); master.gain.value = 0.78;
  comp.connect(master).connect(ac.destination);

  const music = ac.createGain(); music.gain.value = 1;
  const duck = ac.createGain(); duck.gain.value = 1;
  music.connect(duck).connect(comp);
  const drums = ac.createGain(); drums.gain.value = 1; drums.connect(comp);

  const setDuck = (at, amt = 0.42) => {
    duck.gain.setValueAtTime(1, Math.max(0, at - 0.004));
    duck.gain.linearRampToValueAtTime(amt, at + 0.012);
    duck.gain.linearRampToValueAtTime(1, at + 0.26);
  };

  /* ---------------- 鼓 ---------------- */
  const kick = (at, g = 1) => {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(160, at);
    o.frequency.exponentialRampToValueAtTime(42, at + 0.11);
    gn.gain.setValueAtTime(0.0001, at);
    gn.gain.exponentialRampToValueAtTime(1.0 * g, at + 0.005);
    gn.gain.exponentialRampToValueAtTime(0.0001, at + 0.30);
    o.connect(gn).connect(drums); o.start(at); o.stop(at + 0.33);
    const n = noise(), hp = ac.createBiquadFilter(), ng = ac.createGain();
    hp.type = "highpass"; hp.frequency.value = 2800;
    ng.gain.setValueAtTime(0.14 * g, at);
    ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.028);
    n.connect(hp).connect(ng).connect(drums); n.start(at); n.stop(at + 0.05);
    setDuck(at, 0.4);
  };
  const hat = (at, g = 0.14, open = false, pan = 0) => {
    const n = noise(), bp = ac.createBiquadFilter(), gn = ac.createGain();
    const pn = ac.createStereoPanner(); pn.pan.value = pan;
    bp.type = "bandpass"; bp.frequency.value = open ? 6800 : 9200; bp.Q.value = 1.1;
    gn.gain.setValueAtTime(g, at);
    gn.gain.exponentialRampToValueAtTime(0.0001, at + (open ? 0.16 : 0.032));
    n.connect(bp).connect(gn).connect(pn).connect(drums); n.start(at); n.stop(at + 0.2);
  };
  const clap = (at, g = 0.3) => {
    for (let k = 0; k < 3; k++) {
      const n = noise(), bp = ac.createBiquadFilter(), gn = ac.createGain();
      bp.type = "bandpass"; bp.frequency.value = 1850; bp.Q.value = 0.9;
      const tt = at + k * 0.012;
      gn.gain.setValueAtTime(0.0001, tt);
      gn.gain.exponentialRampToValueAtTime(g, tt + 0.002);
      gn.gain.exponentialRampToValueAtTime(0.0001, tt + 0.09);
      n.connect(bp).connect(gn).connect(drums); n.start(tt); n.stop(tt + 0.12);
    }
  };

  /* ---------------- 贝斯 / 铺底 / 铃 ---------------- */
  const bass = (at, freq, len = 0.18, g = 0.5) => {
    const o = ac.createOscillator(), o2 = ac.createOscillator();
    const lp = ac.createBiquadFilter(), gn = ac.createGain();
    o.type = "sawtooth"; o.frequency.value = freq;
    o2.type = "sine"; o2.frequency.value = freq / 2;
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(460, at);
    lp.frequency.exponentialRampToValueAtTime(170, at + len); lp.Q.value = 5;
    gn.gain.setValueAtTime(0.0001, at);
    gn.gain.exponentialRampToValueAtTime(g, at + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(lp); o2.connect(lp); lp.connect(gn).connect(music);
    o.start(at); o2.start(at); o.stop(at + len + 0.02); o2.stop(at + len + 0.02);
  };
  const pad = (at, len, freqs, g = 0.085) => {
    freqs.forEach((f) => {
      [0, 1].forEach((d) => {
        const o = ac.createOscillator(), gn = ac.createGain(), lp = ac.createBiquadFilter();
        o.type = "sawtooth"; o.frequency.value = f * (d ? 1.004 : 0.996);
        lp.type = "lowpass"; lp.frequency.value = 880; lp.Q.value = 0.7;
        gn.gain.setValueAtTime(0.0001, at);
        gn.gain.exponentialRampToValueAtTime(g, at + 0.25);
        gn.gain.setValueAtTime(g, at + len - 0.22);
        gn.gain.exponentialRampToValueAtTime(0.0001, at + len);
        o.connect(lp).connect(gn).connect(music);
        o.start(at); o.stop(at + len + 0.02);
      });
    });
  };
  const bell = (at, freq, g = 0.2, dec = 0.5) => {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), gn = ac.createGain();
    o.type = "sine"; o.frequency.value = freq;
    o2.type = "sine"; o2.frequency.value = freq * 2.01;
    gn.gain.setValueAtTime(0.0001, at);
    gn.gain.exponentialRampToValueAtTime(g, at + 0.008);
    gn.gain.exponentialRampToValueAtTime(0.0001, at + dec);
    o.connect(gn); o2.connect(gn); gn.connect(music);
    o.start(at); o.stop(at + dec + 0.02); o2.start(at); o2.stop(at + dec + 0.02);
  };

  /* ---------------- 换镜重音 / 推进 ---------------- */
  const hit = (at, g = 0.5) => {
    const n = noise(), bp = ac.createBiquadFilter(), gn = ac.createGain();
    bp.type = "bandpass"; bp.frequency.setValueAtTime(2400, at);
    bp.frequency.exponentialRampToValueAtTime(160, at + 0.22); bp.Q.value = 0.8;
    gn.gain.setValueAtTime(g, at);
    gn.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
    n.connect(bp).connect(gn).connect(drums); n.start(at); n.stop(at + 0.35);
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(190, at);
    o.frequency.exponentialRampToValueAtTime(56, at + 0.3);
    og.gain.setValueAtTime(0.0001, at);
    og.gain.exponentialRampToValueAtTime(g * 0.95, at + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, at + 0.48);
    o.connect(og).connect(drums); o.start(at); o.stop(at + 0.5);
  };
  const riser = (t0, t1, g = 0.2) => {
    const n = noise(), bp = ac.createBiquadFilter(), gn = ac.createGain();
    bp.type = "bandpass"; bp.Q.value = 2.6;
    bp.frequency.setValueAtTime(300, t0);
    bp.frequency.exponentialRampToValueAtTime(7800, t1);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(g, t1 - 0.05);
    gn.gain.exponentialRampToValueAtTime(0.0001, t1);
    n.connect(bp).connect(gn).connect(music); n.start(t0); n.stop(t1 + 0.02);
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(96, t0);
    o.frequency.exponentialRampToValueAtTime(760, t1);
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.06, t1 - 0.06);
    og.gain.exponentialRampToValueAtTime(0.0001, t1);
    o.connect(og).connect(music); o.start(t0); o.stop(t1 + 0.02);
  };
  const downlift = (at) => {
    const n = noise(), bp = ac.createBiquadFilter(), gn = ac.createGain();
    bp.type = "bandpass"; bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(5200, at);
    bp.frequency.exponentialRampToValueAtTime(300, at + 0.42);
    gn.gain.setValueAtTime(0.15, at);
    gn.gain.exponentialRampToValueAtTime(0.0001, at + 0.44);
    n.connect(bp).connect(gn).connect(drums); n.start(at); n.stop(at + 0.46);
  };

  /* ================= 编曲 ================= */
  const A1 = 55, C2 = 65.41, G1 = 49;
  for (let b = 0; b < 60; b++) {
    const at = b * 0.5;
    kick(at, b % 4 === 0 ? 1 : 0.88);
    for (let k = 0; k < 4; k++) {
      const v = k === 0 ? 0.10 : k === 2 ? 0.16 : 0.055;
      hat(at + k * 0.125, v, false, k % 2 ? 0.16 : -0.16);
    }
    if (b % 8 === 7) hat(at + 0.375, 0.13, true, 0);
    if (b % 8 === 4) clap(at, 0.24);
    if (b >= 2) {
      const root = b < 36 ? A1 : b < 48 ? C2 : G1;
      const oct = (i) => (i % 8 === 2 || i % 8 === 6 ? 2 : 1);
      bass(at, root * oct(b * 2), 0.16, b % 4 === 0 ? 0.5 : 0.34);
      bass(at + 0.25, root * oct(b * 2 + 1), 0.13, 0.26);
    }
  }
  const chords = [
    [110, 130.81, 164.81], [98, 123.47, 164.81], [110, 130.81, 146.83],
    [87.31, 110, 130.81], [110, 130.81, 164.81], [98, 123.47, 146.83],
    [110, 130.81, 174.61], [87.31, 110, 130.81], [110, 130.81, 164.81], [110, 146.83, 164.81],
  ];
  chords.forEach((ch, i) => pad(i * 3, 3.05, ch, 0.08));

  const motif = (t0) => { [880, 1108.7, 1318.5].forEach((f, i) => bell(t0 + i * 0.125, f, 0.15, 0.6)); };
  motif(6.0); motif(15.0); motif(24.0); motif(27.0);
  for (let i = 0; i < 14; i++) bell(21.05 + i * 0.0625 + (i % 3) * 0.01, 1760 + (i % 4) * 220, 0.045, 0.12);

  [3, 6, 9, 12, 15, 18, 21, 24, 27].forEach((at, i) => { hit(at, i === 7 ? 0.68 : 0.42); downlift(at - 0.34); });
  hit(0.0, 0.5);
  riser(14.0, 14.96, 0.2);
  riser(23.0, 23.96, 0.24);
  riser(26.4, 26.96, 0.2);
  hit(24.0, 0.6);
  hit(27.0, 0.56);
  hit(29.0, 0.78);
  kick(29.5, 0.72);
  (() => {
    const n = noise(), hp = ac.createBiquadFilter(), gn = ac.createGain();
    hp.type = "highpass"; hp.frequency.value = 5200;
    gn.gain.setValueAtTime(0.11, 29.9);
    gn.gain.exponentialRampToValueAtTime(0.0001, 29.98);
    n.connect(hp).connect(gn).connect(drums); n.start(29.9); n.stop(29.98);
  })();

  /* ---------------- 写 WAV ---------------- */
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
console.log("audio written", fs.statSync(path.join(ROOT, "audio", "soundtrack30.wav")).size);
await browser.close();
