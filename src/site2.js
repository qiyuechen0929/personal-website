/* ==================================================================
   2D 升级包（动效 + 可玩性）  —  由 Ekko 追加，独立 IIFE
   · UI 音效开关 / 跟随光标的光与拖尾 / 逐字揭示 / Hero 视差
   · 跑马灯 / 大门口"镜头前置"/ 暗角
   · 角落的猫：眼睛追光标、会眨眼、可撸（计数 + 呼噜 + 爱心）
   ================================================================== */
(function () {
  const siteEl = document.getElementById("site");
  if (!siteEl) return;
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover:none)").matches;
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- UI 音效 ---------------- */
  const Sfx = (function () {
    let ctx = null;
    let on = true;
    try { on = localStorage.getItem("site_sound") !== "0"; } catch (e) {}
    function ac() {
      if (!ctx) { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); } catch (e) {} }
      if (ctx && ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(f, d, type, g, to) {
      const c = ac(); if (!c || !on) return;
      const t = c.currentTime, o = c.createOscillator(), gg = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
      gg.gain.setValueAtTime(.0001, t);
      gg.gain.exponentialRampToValueAtTime(g || .02, t + .012);
      gg.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(gg).connect(c.destination); o.start(t); o.stop(t + d + .02);
    }
    function noise(d, g, cut) {
      const c = ac(); if (!c || !on) return;
      const n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(); s.buffer = b;
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = cut || 900; f.Q.value = .9;
      const gg = c.createGain(); gg.gain.value = g || .06;
      s.connect(f).connect(gg).connect(c.destination); s.start();
    }
    return {
      get on() { return on; },
      unlock() { ac(); },
      toggle() { on = !on; try { localStorage.setItem("site_sound", on ? "1" : "0"); } catch (e) {} if (on) { ac(); tone(880, .08, "triangle", .03); } return on; },
      hover() { tone(1240, .045, "triangle", .012); },
      click() { tone(300, .07, "triangle", .035, 180); noise(.09, .03, 700); },
      enter() { tone(140, .5, "sawtooth", .05, 70); noise(.45, .07, 420); },
      purr() {
        const c = ac(); if (!c || !on) return;
        const t = c.currentTime, o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
        o.type = "sawtooth"; o.frequency.value = 54;
        l.frequency.value = 24; lg.gain.value = .022; l.connect(lg).connect(g.gain);
        g.gain.value = .028; o.connect(g).connect(c.destination);
        o.start(t); l.start(t); o.stop(t + .8); l.stop(t + .8);
      },
      meow() {
        const c = ac(); if (!c || !on) return;
        const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = "sawtooth"; o.frequency.setValueAtTime(720, t); o.frequency.exponentialRampToValueAtTime(430, t + .3);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + .36);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + .38);
      }
    };
  })();
  addEventListener("pointerdown", () => Sfx.unlock(), { once: true });

  // 顶部声音按钮：同时管 BGM 与 UI 音效
  const soundBtn = document.getElementById("st-sound");
  if (soundBtn) {
    const dot = document.createElement("i");
    dot.className = "badge";
    soundBtn.style.position = "relative";
    soundBtn.appendChild(dot);
    soundBtn.classList.toggle("off", !Sfx.on);
    soundBtn.addEventListener("click", () => { setTimeout(() => soundBtn.classList.toggle("off", !Sfx.on), 0); });
  }

  /* 悬停 / 点击音效 */
  document.querySelectorAll("a,button,.card,.book,.social,.chip,#door-big,#doorway").forEach((el) => {
    el.addEventListener("pointerenter", () => Sfx.hover());
    el.addEventListener("click", () => Sfx.click());
  });

  /* ---------------- 跟随光标的光 + 拖尾 ---------------- */
  (function initLightTrail() {
    const light = $("#light"), trail = $("#trail");
    if (!light || !trail || isTouch) return;
    const N = 7, dots = [];
    for (let i = 0; i < N; i++) { const d = document.createElement("i"); trail.appendChild(d); dots.push({ el: d, x: innerWidth / 2, y: innerHeight / 2 }); }
    let x = innerWidth / 2, y = innerHeight / 2, lx = x, ly = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; light.style.opacity = "1"; }, { passive: true });
    (function loop() {
      lx += (x - lx) * .12; ly += (y - ly) * .12;
      light.style.transform = "translate(" + lx + "px," + ly + "px)";
      let px = x, py = y;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x += (px - d.x) * .3; d.y += (py - d.y) * .3;
        d.el.style.transform = "translate(" + d.x + "px," + d.y + "px)";
        d.el.style.opacity = (0.30 * (1 - i / dots.length)).toFixed(3);
        d.el.style.width = d.el.style.height = (5 - i * .5) + "px";
        px = d.x; py = d.y;
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------------- Hero：逐字揭示 + 视差 ---------------- */
  (function initHeroMotion() {
    const h1 = document.querySelector("#hero h1");
    if (h1) {
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            [...n.textContent].forEach((ch, i) => {
              const s = document.createElement("span");
              s.className = "ch"; s.textContent = ch;
              s.style.animationDelay = (0.06 * i + 0.1).toFixed(2) + "s";
              frag.appendChild(s);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
        });
      };
      walk(h1);

      // 逐字渐变：按每个字在 h1 里的横向偏移摆放渐变，视觉上仍是整行一条渐变
      function alignGradient() {
        const box = h1.getBoundingClientRect();
        h1.querySelectorAll(".ch").forEach((sp) => {
          const r = sp.getBoundingClientRect();
          sp.style.backgroundSize = box.width.toFixed(1) + "px 100%";
          sp.style.backgroundPosition = "-" + (r.left - box.left).toFixed(1) + "px 0";
        });
      }
      const sweep = document.createElement("i");
      sweep.className = "sweep";
      h1.appendChild(sweep);
      requestAnimationFrame(alignGradient);
      addEventListener("resize", alignGradient);
      setTimeout(alignGradient, 400);
      setTimeout(alignGradient, 1200);
    }
    if (isTouch || REDUCED) return;
    const right = document.querySelector("#hero .stage-right"), orbs = document.querySelectorAll("#hero .glow-orb");
    addEventListener("pointermove", (e) => {
      if (window.__site && window.__site.mode !== "site") return;
      const nx = (e.clientX / innerWidth - .5) * 2, ny = (e.clientY / innerHeight - .5) * 2;
      right && right.style.setProperty("--px", nx.toFixed(3));
      right && right.style.setProperty("--py", ny.toFixed(3));
      orbs.forEach((o, i) => { o.style.transform = "translate(" + (nx * (10 + i * 8)).toFixed(1) + "px," + (ny * (8 + i * 6)).toFixed(1) + "px)"; });
    }, { passive: true });
  })();

  /* ---------------- 跑马灯 ---------------- */
  (function initMarquee() {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const items = ["写代码", "做工具", "看文档", "喝咖啡", "深夜爱好者", "细节控", "持续学习", "Three.js", "Flutter", "手搓 HTML", "零素材纯代码", "把工具做温柔一点"];
    const box = document.createElement("div");
    box.id = "marquee";
    const track = document.createElement("div");
    track.className = "track";
    const one = () => items.map((t) => "<span>" + t + "</span>").join("");
    track.innerHTML = one() + one();      // 复制一份做无缝循环
    box.appendChild(track);
    hero.insertAdjacentElement("afterend", box);
  })();

  /* ---------------- 大门口"镜头前置" + 暗角 ---------------- */
  (function initDoorApproach() {
    const cta = document.getElementById("portal-cta");
    const vig = document.getElementById("vignette");
    if (!cta) return;
    const door = document.createElement("div");
    door.id = "door-big";
    door.setAttribute("role", "button");
    door.setAttribute("tabindex", "0");
    door.innerHTML = '<div class="cat"><div class="tail"></div><div class="body"></div><div class="head"></div><div class="ear l"></div><div class="ear r"></div></div>' +
      '<div class="hint">推门进去 · 里面是我的空间</div>';
    cta.insertBefore(door, cta.firstChild);
    const go = (e) => { if (window.__site) { Sfx.enter(); window.__site.enter(door); } e.stopPropagation(); };
    door.addEventListener("click", go);
    door.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") go(e); });

    function pass() {
      const r = cta.getBoundingClientRect();
      const vh = siteEl.clientHeight;
      const p = clamp(1 - (r.top - vh * .18) / (vh * .72), 0, 1);
      door.style.setProperty("--dl", p.toFixed(3));
      if (vig) vig.style.opacity = (p * (document.documentElement.getAttribute("data-theme") === "dark" ? .72 : .34)).toFixed(3);
    }
    siteEl.addEventListener("scroll", pass, { passive: true });
    addEventListener("resize", pass);
    requestAnimationFrame(pass);
  })();

  /* ---------------- 角落的猫：追眼睛 / 眨眼 / 可撸 ---------------- */
  (function initPet() {
    const pet = document.getElementById("pet");
    if (!pet) return;
    const eyes = pet.querySelectorAll(".peye"), blinks = pet.querySelectorAll(".pblink");
    let cx = 0, cy = 0;
    function measure() { const r = pet.getBoundingClientRect(); cx = r.left + r.width * .62; cy = r.top + r.height * .5; }
    measure(); addEventListener("resize", measure); addEventListener("scroll", measure, true);
    addEventListener("pointermove", (e) => {
      if (matchMedia("(hover:none)").matches) return;
      const dx = clamp((e.clientX - cx) / 160, -1, 1), dy = clamp((e.clientY - cy) / 160, -1, 1);
      eyes.forEach((el) => { el.style.transform = "translate(" + (dx * 2.4).toFixed(2) + "px," + (dy * 2).toFixed(2) + "px)"; });
    }, { passive: true });
    (function blinkLoop() {
      setTimeout(() => {
        blinks.forEach((b) => (b.style.height = "9px"));
        setTimeout(() => blinks.forEach((b) => (b.style.height = "0px")), 110);
        blinkLoop();
      }, 2600 + Math.random() * 4200);
    })();

    let count = 0;
    try { count = parseInt(localStorage.getItem("pet_count") || "0", 10) || 0; } catch (e) {}
    function petIt(e) {
      pet.classList.add("pet");
      setTimeout(() => pet.classList.remove("pet"), 1000);
      Sfx.purr();
      const r = pet.getBoundingClientRect();
      for (let i = 0; i < 4; i++) {
        const h = document.createElement("span");
        h.className = "hearts";
        h.textContent = ["❤️", "💛", "🧡", "💙"][i % 4];
        h.style.left = (r.left + r.width * .5 + (Math.random() * 40 - 20)) + "px";
        h.style.top = (r.top + 10) + "px";
        h.style.setProperty("--hx", (Math.random() * 60 - 30) + "px");
        h.style.animationDelay = (i * .08) + "s";
        document.body.appendChild(h);
        setTimeout(() => h.remove(), 1600);
      }
      count++;
      try { localStorage.setItem("pet_count", String(count)); } catch (e) {}
      if (typeof toast === "function" && count % 5 === 0) toast("喵～ 已经被摸 " + count + " 次了");
      else if (count === 1 && typeof toast === "function") toast("呼噜噜… 它认得你了");
    }
    pet.addEventListener("click", petIt);
    pet.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") petIt(e); });
  })();
})();
