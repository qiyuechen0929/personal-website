/* ==================================================================
   Ekko 追加 · 3D 房间玩法升级包 v2（由 site.js 的 ensureRoom 调用 install）
      · 自动导览：闲置一会儿，镜头自己带你逛
   · 猫的反应：扫吉他会点头；下雨会缩起来
   · 每件发光物件都记进探索成就
   ================================================================== */
(function () {
  let installed = false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function install() {
    if (installed) return;
    const R = window.__room;
    if (!R || !R.scene || !R.cam || !R.interact) return;
    const scene = R.scene, camera = R.cam, T = window.THREE;
    const box = (w, h, d, mat) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; return m; };
    const M = (c, rough = .9, metal = 0) => new T.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });

    /* ---------- 音效（跟随网站音效开关） ---------- */
    let actx = null;
    const soundOn = () => { try { return localStorage.getItem("site_sound") !== "0"; } catch (e) { return true; } };
    function beep(f, d, type, g, to) {
      if (!soundOn()) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        if (!actx) actx = new AC();
        if (actx.state === "suspended") actx.resume();
        const t = actx.currentTime, o = actx.createOscillator(), gg = actx.createGain();
        o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
        gg.gain.setValueAtTime(.0001, t);
        gg.gain.exponentialRampToValueAtTime(g || .03, t + .015);
        gg.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(gg).connect(actx.destination); o.start(t); o.stop(t + d + .04);
      } catch (e) {}
    }
    function noise(d, g, lo) {
      if (!soundOn()) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        if (!actx) actx = new AC();
        const n = Math.floor(actx.sampleRate * d), b = actx.createBuffer(1, n, actx.sampleRate), ch = b.getChannelData(0);
        for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
        const s = actx.createBufferSource(); s.buffer = b;
        const f = actx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = lo || 1400; f.Q.value = .8;
        const gg = actx.createGain(); gg.gain.value = g || .05;
        s.connect(f).connect(gg).connect(actx.destination); s.start();
      } catch (e) {}
    }
    const EX = window.__explore;
    const say = (m) => { if (typeof R.toast === "function") R.toast(m); };

    const anim = [];
    const hot = (id, label, objects, anchor, action, fly) => {
      const h = { id, label, objects: [].concat(objects), anchor, action, fly, pulse: Math.random() * 6 };
      h.objects.forEach((o) => { o.userData.hot = h; });
      R.interact.push(h);
      return h;
    };

    /* ==================================================================
       2) 猫的反应：扫吉他会点头，下雨会缩起来
       ================================================================== */
    const catHot = R.interact.find((h) => h.id === "cat");
    const catParts = catHot ? catHot.objects.map((o) => ({ o, y: o.position.y })) : [];
    let catBob = 0, catDuck = false;
    anim.push((t) => {
      if (!catParts.length) return;
      if (catBob > 0) catBob -= 1 / 60;
      catParts.forEach((p, i) => {
        const bob = catBob > 0 ? Math.sin(catBob * 26) * .022 * Math.min(1, catBob * 2) : 0;
        const duck = catDuck ? (i === 0 ? -.055 : -.075) : 0;
        p.o.position.y = p.y + bob + duck;
      });
    });
    function wrap(id, after) {
      const h = R.interact.find((x) => x.id === id);
      if (!h) return;
      const orig = h.action;
      h.action = (hh) => { const r = orig(hh); try { after(); } catch (e) {} return r; };
    }
    wrap("guitar", () => { catBob = 1.15; });
    let rainState = false;
    wrap("weather", () => { rainState = !rainState; catDuck = rainState; if (rainState) say("外面下雨了 · 猫往桌子底下挪了挪"); });

    /* ==================================================================
       3) 自动导览：闲置时镜头自己带你逛
       ================================================================== */
    let lastAct = performance.now(), tours = 0, nextTour = 32000;
    ["pointerdown", "wheel", "keydown"].forEach((ev) => addEventListener(ev, () => { lastAct = performance.now(); tours = 0; }, { passive: true, capture: true }));
    setInterval(() => {
      const S = window.__site;
      if (!S || S.mode !== "space" || S.busy) { lastAct = performance.now(); return; }
      const panel = document.getElementById("panel");
      if (panel && panel.classList.contains("on")) { lastAct = performance.now(); return; }
      if (performance.now() - lastAct < nextTour || tours >= 3) return;
      const cands = R.interact.filter((h) => h.fly);
      if (!cands.length) return;
      const h = cands[(Math.random() * cands.length) | 0];
      tours++; lastAct = performance.now(); nextTour = 30000;
      say("带你去看看：" + (h.label || h.id));
      R.flyTo(h.fly, 2200);
      beep(660, .2, "sine", .02, 880);
    }, 3000);

    /* ==================================================================
       4) 热区 → 探索成就
       ================================================================== */
    if (EX) {
      R.interact.forEach((h) => {
        const orig = h.action;
        h.action = (hh) => { try { EX.mark("hot:" + h.id); } catch (e) {} return orig(hh); };
      });
      EX.setHotspots(R.interact.map((h) => ({ k: "hot:" + h.id, t: h.label, hint: "屋里某件发光的物件（还没点过）" })));
      if (EX.mark) EX.mark("hot:cat");            // 撸猫在房间外也能点，别卡成就
    }

    /* ---------- 首次进屋的小提示 ---------- */
    let greeted = false;
    setInterval(() => {
      const S = window.__site;
      if (greeted || !S || S.mode !== "space") return;
      greeted = true;
      setTimeout(() => say("新添了几样：挂钟（北京时间）、鱼缸、吉他、气象球、纸飞机、地球仪，还有桌上那张手稿"), 900);
    }, 1500);

    anim.push(() => {});
    const t0 = performance.now();
    (function loop() {
      const t = (performance.now() - t0) / 1000;
      const S = window.__site;
      if (S && S.mode === "space") for (let i = 0; i < anim.length; i++) { try { anim[i](t); } catch (e) {} }
      requestAnimationFrame(loop);
    })();

    installed = true;
    console.log("[site6] 自动导览 / 猫的反应 / 热区成就 已就绪（热区 " + R.interact.length + " 件）");
  }

  window.__site6 = { install, get installed() { return installed; } };
})();
