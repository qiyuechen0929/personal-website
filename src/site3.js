/* ==================================================================
   3D 书房扩展包（Ekko 追加）—— 新物品与玩法  v2
   · 挂钟：走真实「北京时间」(UTC+8)，时针/分针/秒针角度修正
   · 鱼缸：鱼在游、吐泡泡，点击投喂（运镜对准缸体）
   · 墙上吉他：点击扫弦（真出声，循环换和弦），运镜从屋里侧看墙
   · 窗台气象：点击让窗外下雨 / 放晴
   · 纸飞机：点屋里任何地方扔出一架
   · 小地球仪：点击 → 地球转到随机目的地 + 定位针 + 当地时间和距北京距离
   通过 window.__room 复用原有 hot/相机/音效，互不干扰
   ================================================================== */
(function () {
  const M = (color, rough = .9, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const box = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; return m; };
  const cyl = (rt, rb, h, mat, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; };
  const sph = (r, mat, seg = 18) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat); m.castShadow = m.receiveShadow = true; return m; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- 北京时间的工具 ---------------- */
  const p2 = (n) => String(Math.floor(n)).padStart(2, "0");
  // 把 UTC 时间戳平移后再读 UTC 字段 → 与运行机器的时区无关（正确做法）
  function wallClock(tzHours) {
    const d = new Date(Date.now() + tzHours * 3600 * 1000);
    return { h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds() + d.getUTCMilliseconds() / 1000 };
  }
  const bjClock = () => wallClock(8);    // 北京时间 UTC+8
  function bjDate() {                    // 兼容旧调用
    const c = bjClock();
    return { getHours: () => c.h, getMinutes: () => c.m, getSeconds: () => Math.floor(c.s) };
  }
  function localTimeAt(tz) {             // 某个时区的当前时刻
    const c = wallClock(tz);
    return p2(c.h) + ":" + p2(c.m);
  }
  function kmFromBeijing(lat, lon) {     // 距离北京的大圆距离
    const R = 6371, r = Math.PI / 180;
    const dLat = (lat - 39.90) * r, dLon = (lon - 116.41) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(39.90 * r) * Math.cos(lat * r) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)) / 10) * 10;
  }

  /* ---------------- 音效（自带开关，默认开；跟随网站的音效开关） ---------------- */
  const SND = (function () {
    let ctx = null;
    function muted() { try { return localStorage.getItem("site_sound") === "0"; } catch (e) { return false; } }
    const ac = () => {
      if (!ctx) { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); } catch (e) {} }
      if (ctx && ctx.state === "suspended") ctx.resume();
      return ctx;
    };
    function unlock() { ac(); }
    function tone(f, d, type, g, to, delay) {
      if (muted()) return;
      const c = ac(); if (!c) return;
      const t = c.currentTime + (delay || 0), o = c.createOscillator(), gg = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
      gg.gain.setValueAtTime(.0001, t);
      gg.gain.exponentialRampToValueAtTime(g || .03, t + .02);
      gg.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(gg).connect(c.destination); o.start(t); o.stop(t + d + .05);
    }
    function noise(d, g, lo, Q) {
      if (muted()) return;
      const c = ac(); if (!c) return;
      const n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      const s = c.createBufferSource(); s.buffer = b;
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = lo || 1200; f.Q.value = Q || .7;
      const gg = c.createGain(); gg.gain.value = g || .05;
      s.connect(f).connect(gg).connect(c.destination); s.start();
    }
    // 拨弦：短促的三角波 + 一点点噪声，像钢丝弦
    function pluck(f, when, g) {
      tone(f, .9, "triangle", g || .035, f * 1.005, when);
      tone(f * 2, .35, "sine", (g || .035) * .45, f * 2.01, when);
      if (when < .02) noise(.05, .012, 3000, 1.2);
    }
    return {
      unlock,
      get muted() { return muted(); },
      chime(freqs) { (freqs || [880, 1108.7, 1318.5]).forEach((f, i) => tone(f, .9, "sine", .035, null, i * .12)); },
      tickTock() { noise(.03, .012, 2200, 1.4); },
      // 六弦扫弦：从低到高依次拨，带一点"扫"的时间差
      strum(freqs) {
        (freqs || []).forEach((f, i) => pluck(f, i * .028, .03));
        noise(.14, .022, 2400, .8);
      },
      splash() { noise(.35, .07, 700, .6); },
      rain() { noise(2.2, .05, 2400, .5); },
      pop() { tone(520, .08, "triangle", .03, 900); },
      throwWhoosh() { noise(.22, .035, 500, .7); },
      ding(f) { tone(f || 1320, .5, "sine", .03, null, 0); }
    };
  })();

  let installed = false;
  function install() {
    if (installed) return;
    const R = window.__room;
    if (!R) return;
    const scene = R.scene;
    if (!scene) return;
    const camera = R.camera;              // 真正的 THREE 相机（R.cam 只是相机状态，没有 position）

    const hot = (id, label, objects, anchor, action, fly) => {
      const h = { id, label, objects: [].concat(objects), anchor, action, fly, pulse: Math.random() * 6 };
      h.objects.forEach((o) => { o.userData.hot = h; });
      R.interact.push(h);
      return h;
    };
    const flyThen = (h, cb) => { if (h.fly) R.flyTo(h.fly, 1200, cb); else cb(); };

    const anim = [];
    const add = (o) => { scene.add(o); return o; };
    const T = {};

    /* ================= 1. 挂钟（真实北京时间） ================= */
    (function clock() {
      const g = new THREE.Group();
      g.position.set(2.05, 3.05, -4.44);
      const rim = cyl(.42, .42, .08, M(0x6b4630, .7), 28); rim.rotation.x = Math.PI / 2; g.add(rim);
      const face = cyl(.375, .375, .02, M(0xf6f1e7, .95), 28); face.rotation.x = Math.PI / 2; face.position.z = .05; g.add(face);
      for (let i = 0; i < 12; i++) {
        const t = box(.02, i % 3 === 0 ? .075 : .045, .01, M(0x2b2d34, .8));
        const a = i / 12 * Math.PI * 2;
        t.position.set(Math.sin(a) * .3, Math.cos(a) * .3, .07); t.rotation.z = -a; g.add(t);
      }
      for (let i = 0; i < 60; i++) {                 // 分钟小点
        if (i % 5 === 0) continue;
        const t = box(.008, .018, .008, M(0x9a9186, .9));
        const a = i / 60 * Math.PI * 2;
        t.position.set(Math.sin(a) * .325, Math.cos(a) * .325, .07); t.rotation.z = -a; g.add(t);
      }
      // 指针：几何朝 +y 延伸、枢轴在圆心；rotation.z 取「负角度」→ 顺时针走、12 点在正上方
      // （之前是朝 -y + 正角度，等于把表盘镜像了：11 点会指到 7 点）
      const hand = (len, w, thick, mat) => { const m = box(w, len, thick, mat); m.geometry.translate(0, len / 2, 0); return m; };
      const hh = hand(.19, .024, .012, M(0x22242b, .6)); hh.position.z = .08; g.add(hh);
      const mh = hand(.27, .017, .012, M(0x22242b, .6)); mh.position.z = .09; g.add(mh);
      const sh = hand(.30, .009, .009, M(0xc0452e, .5)); sh.position.z = .10; g.add(sh);
      const dot = sph(.022, M(0x22242b, .5)); dot.position.set(0, 0, .11); g.add(dot);
      add(g); T.clock = g;

      anim.push(() => {
        const c = bjClock();                         // ← 北京时间（UTC+8，与时区无关）
        const s = c.s;
        const m = c.m + s / 60;
        const h = (c.h % 12) + m / 60;
        // 顺时针为正：rotation.z = -角度
        sh.rotation.z = -(s / 60) * Math.PI * 2;
        mh.rotation.z = -(m / 60) * Math.PI * 2;
        hh.rotation.z = -(h / 12) * Math.PI * 2;
      });

      hot("clock", "挂钟 · 北京时间",
        [rim, face, hh, mh, sh, dot],
        new THREE.Vector3(2.05, 2.6, -4.0),
        (h) => {
          const c = bjClock();
          SND.chime(); SND.tickTock();
          if (typeof R.toast === "function") {
            R.toast("北京时间 " + p2(c.h) + ":" + p2(c.m) + ":" + p2(c.s) + " · 这里的钟不走时间差");
          }
          flyThen(h, () => {});
        },
        { yaw: .02, pitch: .17, radius: 2.1, tx: 2.05, ty: 2.88, tz: -4.3 });
    })();

    /* ================= 2. 鱼缸（可投喂） ================= */
    (function tank() {
      const stool = box(.62, .42, .62, M(0x8a5d3c, .75));
      stool.position.set(-3.25, .21, -3.5); add(stool);
      const g = new THREE.Group(); g.position.set(-3.25, .42, -3.5); add(g);
      const glass = box(.62, .44, .62, new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: .1, metalness: .05, transparent: true, opacity: .22 }));
      glass.position.y = .22; g.add(glass);
      const rim = box(.66, .04, .66, M(0x8a5d3c, .7)); rim.position.y = .44; g.add(rim);
      const water = box(.58, .34, .58, new THREE.MeshStandardMaterial({ color: 0x3f86a8, roughness: .2, transparent: true, opacity: .34 }));
      water.position.y = .2; g.add(water);
      const sand = box(.58, .05, .58, M(0xd9c9a5, .95)); sand.position.y = .045; g.add(sand);
      const weed = box(.05, .22, .05, M(0x3f7a4a, .85)); weed.position.set(-.2, .16, .16); g.add(weed);
      const weed2 = box(.04, .16, .04, M(0x4f8f5a, .85)); weed2.position.set(-.12, .13, .2); g.add(weed2);
      const rock = sph(.07, M(0x8b8b86, .95), 8); rock.position.set(.16, .07, -.15); rock.scale.y = .6; g.add(rock);
      const fishes = [];
      const fcolors = [0xffb066, 0xff7a7a, 0x9fd4ff, 0xffd166];
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Group();
        const body = sph(.052, M(fcolors[i], .45), 12); body.scale.set(1.5, .8, .5); f.add(body);
        const tail = box(.055, .05, .012, new THREE.MeshStandardMaterial({ color: fcolors[i], roughness: .5, transparent: true, opacity: .95 }));
        tail.position.x = -.085; f.add(tail);
        const eye = sph(.011, M(0x1a1a1a, .3), 8); eye.position.set(.052, .014, .026); f.add(eye);
        const eye2 = eye.clone(); eye2.position.z = -.026; f.add(eye2);
        f.position.set(-.15 + i * .1, .2, -.1 + i * .07);
        g.add(f);
        fishes.push({ g: f, body, tail, seed: i * 1.7, speed: .5 + i * .13, phase: i * 2.1 });
      }
      const bubbles = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Array(30 * 3).fill(0).map(() => (Math.random() - .5) * .4), 3)),
        new THREE.PointsMaterial({ color: 0xdfefff, size: .018, transparent: true, opacity: .7 })
      );
      g.add(bubbles);
      const bseed = new Array(30).fill(0).map(() => ({ p: Math.random(), x: (Math.random() - .5) * .4, z: (Math.random() - .5) * .4 }));

      let feed = 0, feedX = 0, feedZ = 0;
      anim.push((t) => {
        fishes.forEach((f) => {
          if (feed > 0) {
            f.g.position.x += (feedX - f.g.position.x) * .06;
            f.g.position.z += (feedZ - f.g.position.z) * .06;
            f.g.position.y += (.24 - f.g.position.y) * .06;
            f.g.rotation.y = Math.atan2(feedX - f.g.position.x, feedZ - f.g.position.z);
          } else {
            const a = t * f.speed + f.seed;
            f.g.position.x = Math.sin(a) * .21;
            f.g.position.z = Math.cos(a * .8 + f.phase) * .21;
            f.g.position.y = .2 + Math.sin(a * 2.2) * .045;
            f.g.rotation.y = -a + Math.PI / 2;
          }
          f.tail.rotation.y = Math.sin(t * 9 + f.seed) * .5;
        });
        const pos = bubbles.geometry.attributes.position.array;
        for (let i = 0; i < bseed.length; i++) {
          const b = bseed[i]; b.p = (b.p + .012) % 1;
          pos[i * 3] = b.x + Math.sin(t * 1.2 + i) * .015;
          pos[i * 3 + 1] = .06 + b.p * .32;
          pos[i * 3 + 2] = b.z;
        }
        bubbles.geometry.attributes.position.needsUpdate = true;
        if (feed > 0) feed -= 1 / 60;
      });

      hot("tank", "鱼缸 · 投喂一下",
        [glass, water, sand, rim, ...fishes.map((f) => f.g)],
        new THREE.Vector3(-3.25, .8, -3.2),
        (h) => {
          feed = 2.6; feedX = (Math.random() - .5) * .3; feedZ = (Math.random() - .5) * .3;
          SND.splash(); SND.pop();
          if (typeof R.toast === "function") R.toast("撒了一把鱼食 · 它们抢得很激动");
          flyThen(h, () => {});
        },
        // 相机 = 目标 + (sin(yaw), sin(pitch), cos(yaw)) * radius → 左前方物体要用「正」yaw 才能站进屋里的空地
        { yaw: .3, pitch: .22, radius: 1.7, tx: -3.25, ty: .84, tz: -3.5 });
    })();

    /* ================= 3. 墙上吉他（可扫弦，循环换和弦） ================= */
    (function guitar() {
      const g = new THREE.Group();
      g.position.set(-5.34, 2.2, 1.15); g.rotation.y = Math.PI / 2; g.rotation.z = .05; g.scale.setScalar(1.18);
      const body1 = box(.46, .58, .09, M(0xc98a4b, .55)); g.add(body1);
      const body2 = box(.36, .4, .1, M(0xe0a765, .5)); body2.position.y = -.02; g.add(body2);
      const hole = cyl(.13, .13, .12, M(0x2a1c12, .9), 22); hole.rotation.x = Math.PI / 2; hole.position.y = .06; g.add(hole);
      const neck = box(.1, .78, .07, M(0x5b3a22, .6)); neck.position.y = .68; g.add(neck);
      const head = box(.16, .18, .06, M(0x3b2515, .6)); head.position.y = 1.12; g.add(head);
      const strings = [];
      for (let i = 0; i < 4; i++) {
        const s = box(.008, 1.0, .008, M(0xf0e6cf, .4, .3));
        s.position.set(-.028 + i * .019, .58, .055); g.add(s); strings.push(s);
      }
      const strap = box(.03, 1.35, .02, M(0x4a3320, .8)); strap.position.set(0, .3, -.07); g.add(strap);
      add(g); T.guitar = g;

      // Am → C → G → F → Em：低音在前，扫起来更像和弦
      const CHORDS = [
        { n: "Am", f: [110, 164.8, 220, 261.6, 329.6, 440] },
        { n: "C", f: [130.8, 164.8, 196, 261.6, 329.6, 523.3] },
        { n: "G", f: [98, 146.8, 196, 246.9, 392, 493.9] },
        { n: "F", f: [87.3, 174.6, 220, 261.6, 349.2, 440] },
        { n: "Em", f: [82.4, 123.5, 164.8, 196, 246.9, 329.6] }
      ];
      let ci = 0, vib = 0, vibAmp = 0;
      anim.push(() => {
        if (vib > 0) {
          vib -= 1 / 60;
          vibAmp = Math.max(0, vib) * .9;
          const k = Math.sin(vib * 62) * vibAmp;
          strings.forEach((s, i) => { s.position.x = (-.028 + i * .019) + k * (.004 + i * .001); });
        }
      });
      hot("guitar", "墙上的吉他 · 拨一下",
        [body1, body2, hole, neck, head, ...strings],
        new THREE.Vector3(-5.0, 2.3, 1.05),
        (h) => {
          SND.unlock();
          const c = CHORDS[ci % CHORDS.length]; ci++;
          SND.strum(c.f);
          vib = 1.1;
          if (typeof R.toast === "function") R.toast("扫了一下 " + c.n + " 和弦 · 再点换下一个");
          flyThen(h, () => {});
        },
        { yaw: 1.62, pitch: .1, radius: 3.4, tx: -5.05, ty: 2.72, tz: 1.15 });
    })();

    /* ================= 4. 窗台气象（让窗外下雨 / 放晴） ================= */
    let rainOn = false, rainPts = null, rainSeeds = null;
    (function weather() {
      const sill = box(.5, .06, .22, M(0x8a5d3c, .8)); sill.position.set(.4, 1.52, -4.36); add(sill);
      const globe = sph(.09, M(0xbfe6ff, .15, .1)); globe.position.set(.4, 1.66, -4.36); add(globe);
      const base = cyl(.06, .08, .08, M(0x6b4630, .7)); base.position.set(.4, 1.58, -4.36); add(base);

      const N = 420, pos = new Float32Array(N * 3);
      rainSeeds = new Array(N).fill(0).map(() => ({ x: (Math.random() - .5) * 5.2, y: Math.random() * 4, z: -5.0 - Math.random() * 2.4, s: 6 + Math.random() * 9 }));
      rainPts = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({ color: 0xa8c8e0, size: .035, transparent: true, opacity: .0 }));
      rainPts.visible = false;
      add(rainPts);
      anim.push(() => {
        if (!rainOn) return;
        const arr = rainPts.geometry.attributes.position.array;
        for (let i = 0; i < N; i++) {
          const r = rainSeeds[i];
          arr[i * 3] = r.x; arr[i * 3 + 1] = r.y; arr[i * 3 + 2] = r.z;
          r.y -= r.s / 60;
          if (r.y < .1) { r.y = 4.2; r.x = (Math.random() - .5) * 5.2; r.z = -5.0 - Math.random() * 2.4; }
        }
        rainPts.geometry.attributes.position.needsUpdate = true;
      });
      hot("weather", "气象球 · 窗外下雨 / 放晴",
        [sill, globe, base],
        new THREE.Vector3(.4, 1.6, -4.0),
        (h) => {
          rainOn = !rainOn;
          rainPts.visible = rainOn;
          rainPts.material.opacity = rainOn ? .55 : 0;
          if (rainOn) SND.rain(); else SND.pop();
          if (typeof R.toast === "function") R.toast(rainOn ? "窗外下起雨了 · 屋里更安静了" : "雨停了 · 云散开一点");
          flyThen(h, () => {});
        },
        { yaw: 0, pitch: .1, radius: 2.6, tx: .4, ty: 1.7, tz: -4.1 });
    })();

    /* ================= 5. 纸飞机 ================= */
    const planes = [];
    function throwPlane(tx, ty, tz) {
      try {
      const g = new THREE.Group();
      const paper = new THREE.MeshStandardMaterial({ color: 0xf5f1e6, roughness: .95 });
      const w1 = box(.22, .006, .1, paper); w1.rotation.z = .18; g.add(w1);
      const w2 = box(.22, .006, .1, paper); w2.rotation.z = -.18; w2.position.x = .01; g.add(w2);
      const fin = box(.1, .05, .004, paper); fin.position.x = -.06; fin.rotation.y = Math.PI / 2; g.add(fin);
      g.castShadow = true;
      const from = new THREE.Vector3(-.75 + (Math.random() - .5) * .3, 1.32 + Math.random() * .3, -3.15 + (Math.random() - .5) * .3);
      g.position.copy(from);
      const to = new THREE.Vector3(tx, ty + .06, tz);
      add(g);
      const life = { g, from, to, t: 0, dur: 1.5 + Math.random() * .5, spin: (Math.random() - .5) * 14, arc: 1.1 + Math.random() * .7, done: false };
      planes.push(life);
      if (planes.length > 12) { const old = planes.shift(); scene.remove(old.g); }
      console.log("[plane] 飞出一架，场上共 " + planes.length + " 架");
      SND.throwWhoosh();
      } catch (err) { console.error("[plane] 抛飞失败：", err); }
    }
    anim.push(() => {
      for (const p of planes) {
        if (p.done) continue;
        p.t += 1 / 60 / p.dur;
        const e = Math.min(p.t, 1);
        const x = p.from.x + (p.to.x - p.from.x) * e;
        const z = p.from.z + (p.to.z - p.from.z) * e;
        const y = p.from.y + (p.to.y - p.from.y) * e + Math.sin(e * Math.PI) * p.arc;
        p.g.position.set(x, y, z);
        p.g.rotation.z += p.spin * .01;
        p.g.rotation.x = Math.sin(e * Math.PI) * .5;
        p.g.rotation.y += .06;
        if (e >= 1) { p.done = true; p.g.rotation.set(-Math.PI / 2 + .12, p.g.rotation.y, .1); p.g.position.y = p.to.y - .02; }
      }
    });
    const rayc = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPt = new THREE.Vector3();
    const stage = document.getElementById("stage");
    if (stage && camera && camera.isCamera) {
      stage.addEventListener("pointerup", (e) => {
        if (!window.__site || window.__site.mode !== "space") return;
        if (window.__site.busy) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el !== stage) return;
        ndc.x = (e.clientX / innerWidth) * 2 - 1;
        ndc.y = -(e.clientY / innerHeight) * 2 + 1;
        rayc.setFromCamera(ndc, camera);
        if (rayc.ray.intersectPlane(floorPlane, hitPt)) {
          if (Math.abs(hitPt.x) < 5.2 && hitPt.z > -4.4 && hitPt.z < 4) throwPlane(hitPt.x, 0, hitPt.z);
        }
      });
    }
    (function deskPlane() {
      // 一叠纸：加厚、错位叠三层，并配一个"隐形大命中盒"，避免小物件点不中
      const stack = box(.2, .026, .26, M(0xf5f1e6, .95));
      stack.position.set(-.75, 1.02, -3.5); stack.rotation.y = .3; add(stack);
      const stackB = box(.19, .02, .25, M(0xfffdf6, .95));
      stackB.position.set(-.76, 1.044, -3.49); stackB.rotation.y = .17; add(stackB);
      const stackC = box(.17, .018, .23, M(0xf7f3e8, .95));
      stackC.position.set(-.74, 1.064, -3.51); stackC.rotation.y = .42; add(stackC);
      const hitpad = box(.42, .3, .42, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hitpad.position.set(-.75, 1.12, -3.5); add(hitpad);
      hot("plane", "一叠纸 · 折一架扔出去", [stack, stackB, stackC, hitpad],
        new THREE.Vector3(-.75, 1.1, -3.5),
        (h) => {
          const ang = Math.random() * Math.PI * 2;
          throwPlane(Math.cos(ang) * 2.2, 0, -1.6 + Math.sin(ang) * 2.2);
          if (typeof R.toast === "function") R.toast("折好了 · 点屋里任何空白处都能再扔一架");
          flyThen(h, () => {});
        },
        { yaw: .18, pitch: .3, radius: 2.0, tx: -.75, ty: 1.12, tz: -3.5 });
    })();

    /* ================= 6. 小地球仪（转去一个目的地） ================= */
    const CITIES = [
      ["东京", 139.69, 35.69, 9], ["新加坡", 103.85, 1.29, 8], ["迪拜", 55.27, 25.2, 4],
      ["伦敦", -0.13, 51.51, 0], ["巴黎", 2.35, 48.86, 1], ["纽约", -74.01, 40.71, -5],
      ["洛杉矶", -118.24, 34.05, -8], ["里约", -43.17, -22.91, -3], ["开罗", 31.24, 30.04, 2],
      ["莫斯科", 37.62, 55.75, 3], ["孟买", 72.88, 19.08, 5.5], ["悉尼", 151.21, -33.87, 10],
      ["雷克雅未克", -21.94, 64.15, 0], ["开普敦", 18.42, -33.92, 2], ["北京", 116.41, 39.9, 8]
    ];
    (function globe() {
      // 用 canvas 现画一张"地球贴图"：蓝海 + 绿色陆块 + 经纬线（零素材）
      function earthTexture() {
        const c = document.createElement("canvas"); c.width = 512; c.height = 256;
        const x = c.getContext("2d");
        x.fillStyle = "#2f6f9e"; x.fillRect(0, 0, 512, 256);
        x.strokeStyle = "rgba(255,255,255,.10)"; x.lineWidth = 1;
        for (let i = 1; i < 12; i++) { x.beginPath(); x.moveTo(0, i * 256 / 12); x.lineTo(512, i * 256 / 12); x.stroke(); }
        for (let i = 1; i < 24; i++) { x.beginPath(); x.moveTo(i * 512 / 24, 0); x.lineTo(i * 512 / 24, 256); x.stroke(); }
        const blobs = [[70, 92, 58], [150, 70, 44], [250, 120, 66], [330, 82, 48], [404, 150, 44], [120, 182, 38], [300, 200, 50], [462, 92, 34], [212, 44, 28], [58, 202, 24], [430, 210, 30]];
        blobs.forEach(([cx, cy, r]) => {
          x.beginPath();
          for (let a = 0; a <= Math.PI * 2 + .01; a += Math.PI / 9) {
            const rr = r * (.7 + Math.random() * .55);
            const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * .7;
            a === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
          }
          x.closePath(); x.fillStyle = "#3f7f4e"; x.fill();
        });
        const t = new THREE.CanvasTexture(c);
        t.wrapS = THREE.RepeatWrapping;
        return t;
      }

      const g = new THREE.Group(); g.position.set(1.72, 1.06, -3.6); add(g);
      const base = cyl(.09, .12, .06, M(0x6b4630, .7)); base.position.y = -.02; g.add(base);
      const arm = cyl(.008, .008, .26, M(0xb08a5a, .5, .4)); arm.position.set(0, .16, -.02); g.add(arm);
      const ballGrp = new THREE.Group(); ballGrp.position.y = .21; g.add(ballGrp);
      const ball = sph(.115, new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: .55, metalness: .05 }), 26);
      ballGrp.add(ball);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.128, .007, 8, 30), M(0xd8b98a, .5, .35));
      ring.rotation.x = Math.PI / 2; ring.position.y = .21; g.add(ring);
      // 定位针（点一下就会挪到目的地）
      const pin = new THREE.Group();
      const pinDot = sph(.017, M(0xe8433f, .35, .1), 10); pin.add(pinDot);
      const pinRing = new THREE.Mesh(new THREE.TorusGeometry(.028, .005, 6, 18), M(0xffd9a0, .4, .2));
      pinRing.rotation.x = Math.PI / 2; pin.add(pinRing);
      pin.position.set(0, .21 + .115, 0); ballGrp.add(pin);

      let yaw = 0, yawTarget = 0, spinFast = 0, pinPulse = 0;
      anim.push((t) => {
        // 闲置时慢慢自转；点击时先快转再缓停到目的地
        if (spinFast > 0) { spinFast -= 1 / 60; yaw += .12; }
        else {
          yaw += .0022;
          const d = ((yawTarget - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          if (Math.abs(d) > .004) yaw += d * .06; else yaw = yawTarget;
        }
        ballGrp.rotation.y = yaw;
        if (pinPulse > 0) { pinPulse -= 1 / 60; const k = 1 + Math.sin(pinPulse * 20) * .12; pinRing.scale.setScalar(k); }
      });
      function placePin(lat, lon) {
        const r = Math.PI / 180;
        const x = Math.cos(lat * r) * Math.sin(lon * r), z = Math.cos(lat * r) * Math.cos(lon * r), y = Math.sin(lat * r);
        pin.position.set(x * .118, .21 + y * .118, z * .118);
      }
      let lastCity = -1;
      hot("globe", "小地球仪 · 转去一个地方",
        [base, arm, ball, ring, pinDot, pinRing],
        new THREE.Vector3(1.72, 1.25, -3.55),
        (h) => {
          let i = Math.floor(Math.random() * CITIES.length);
          if (i === lastCity) i = (i + 1) % CITIES.length;
          lastCity = i;
          const [name, lon, lat, tz] = CITIES[i];
          placePin(lat, lon);
          yawTarget = -lon * Math.PI / 180;
          spinFast = .5; pinPulse = 1.6;
          SND.pop(); SND.ding(1180);
          const km = kmFromBeijing(lat, lon);
          if (typeof R.toast === "function") {
            R.toast("📍 " + name + " · 离北京 " + km.toLocaleString("zh-CN") + " km · 当地 " + localTimeAt(tz));
          }
          flyThen(h, () => {});
        },
        { yaw: -.02, pitch: .22, radius: 1.75, tx: 1.72, ty: 1.24, tz: -3.6 });
    })();


    /* ================= 7. 桌上的手稿（关于未来 AI 的思考 · 点开开面板给链接） ================= */
    (function aiNote() {
      const g = new THREE.Group();
      g.position.set(.52, 1.032, -3.42); g.rotation.y = -.22;
      const cover = box(.30, .016, .38, M(0x6d4a2f, .7)); g.add(cover);
      const pageL = box(.27, .013, .35, M(0xf7f3e8, .95)); pageL.position.set(-.008, .015, 0); pageL.rotation.z = .055; g.add(pageL);
      const pageR = box(.27, .013, .35, M(0xfffdf6, .95)); pageR.position.set(.008, .015, 0); pageR.rotation.z = -.055; g.add(pageR);
      for (let i = 0; i < 5; i++) {
        const ln = box(.19 - i * .022, .002, .007, M(0x9aa0ab, .9));
        ln.position.set(.015, .024, -.115 + i * .048); g.add(ln);
      }
      const spark = sph(.013, M(0xffd79a, .3, .2), 8); spark.position.set(-.095, .052, .125); g.add(spark);
      add(g); T.aiNote = g;
      anim.push((t) => { spark.position.y = .052 + Math.sin(t * 1.7) * .012; });
      hot("ai-note", "桌上的手稿 · 关于未来 AI",
        [cover, pageL, pageR, spark],
        new THREE.Vector3(.52, 1.16, -3.42),
        (h) => {
          SND.pop();
          if (typeof R.toast === "function") R.toast("关于未来 AI 的一点想法 · 写了挺长，去 X 看全文");
          flyThen(h, () => { if (typeof R.openPanel === "function") R.openPanel("thinking", h.anchor); });
        },
        { yaw: .12, pitch: .42, radius: 1.9, tx: .52, ty: 1.06, tz: -3.42 });
    })();

    /* ---------- 我的每帧循环（仅 3D 空间里跑） ---------- */
    const t0 = performance.now();
    (function loop() {
      const t = (performance.now() - t0) / 1000;
      if (window.__site && window.__site.mode === "space") {
        for (let i = 0; i < anim.length; i++) { try { anim[i](t); } catch (e) {} }
      }
      requestAnimationFrame(loop);
    })();

    installed = true;
    console.log("[room-ext] 已加入：挂钟(北京时间) / 鱼缸 / 吉他(可出声) / 窗台气象 / 纸飞机 / 地球仪(可转去目的地)");
  }

  window.__site3 = { install, get installed() { return installed; } };
})();
