/* ==================================================================
   2D 个人主页（门厅）  —  由 Ekko 追加
   · 整段包在 IIFE 里，避免与原有代码重名；对外只暴露 window.__site
   · 自定义光标 / 尘埃 / 滚动进度 / 房间导航 / 揭示 / 卡片倾斜 / 磁吸
   · 推门转场（门厅→空间）、回门厅转场（空间→门厅）
   · 3D 懒初始化；门厅模式下不渲染，省电
   ================================================================== */
(function () {
  let mode = "site";        // site（门厅） | space（3D 空间）
  let busy = false;         // 转场中
  let ready = false;        // 3D 是否已初始化
  let initing = false;      // 正在初始化（防重入）
  let retried = false;      // 是否已经自动重试过一次

  const siteEl = document.getElementById("site");
  const $i = (s) => document.querySelector(s);

  /* ---------------------- 自定义光标 ---------------------- */
  (function initCursor() {
    const dot = document.getElementById("cursor"), ring = document.getElementById("cursor-ring");
    if (!dot || matchMedia("(hover:none)").matches) return;
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.opacity = ring.style.opacity = "1";
      dot.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
      const t = e.target.closest && e.target.closest("a,button,.card,.doorway,.book,.social,[data-cursor]");
      document.body.classList.toggle("cursor-hot", !!t && mode === "site");
    }, { passive: true });
    addEventListener("pointerdown", () => { ring.style.width = ring.style.height = "22px"; });
    addEventListener("pointerup", () => { ring.style.width = ring.style.height = ""; });
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      const w = ring.offsetWidth / 2;
      ring.style.transform = `translate(${rx - w}px, ${ry - w}px)`;
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------------------- 尘埃粒子 ---------------------- */
  (function initDust() {
    const c = document.getElementById("dust");
    if (!c) return;
    const g = c.getContext("2d");
    let W = 0, H = 0;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let ps = [];
    function size() {
      W = innerWidth; H = innerHeight;
      c.width = W * dpr; c.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      ps = Array.from({ length: Math.round(W / 16) }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.6 + 0.3, s: Math.random() * 0.22 + 0.04,
        a: Math.random() * 0.5 + 0.12, ph: Math.random() * 6.28
      }));
    }
    size(); addEventListener("resize", size);
    (function loop() {
      if (mode === "site") {
        g.clearRect(0, 0, W, H);
        for (const p of ps) {
          p.y -= p.s; p.ph += 0.02;
          if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
          const a = p.a * (0.55 + 0.45 * Math.sin(p.ph));
          g.beginPath(); g.fillStyle = "rgba(255,214,160," + a.toFixed(3) + ")";
          g.arc(p.x + Math.sin(p.ph) * 6, p.y, p.r, 0, 6.283); g.fill();
        }
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------------------- 滚动进度 / 房间导航 / 揭示 ---------------------- */
  const SECTIONS = [...document.querySelectorAll("[data-nav]")];
  (function initScrollUI() {
    const bar = document.querySelector("#progress i"), rooms = document.getElementById("rooms");
    SECTIONS.forEach((sec) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", sec.dataset.nav);
      b.innerHTML = "<span>" + sec.dataset.nav + "</span>";
      b.addEventListener("click", () => sec.scrollIntoView({ behavior: window.REDUCED ? "auto" : "smooth", block: "start" }));
      rooms.appendChild(b);
    });
    const btns = [...rooms.children];
    function onScroll() {
      const max = siteEl.scrollHeight - siteEl.clientHeight;
      bar.style.width = (max > 0 ? (siteEl.scrollTop / max) * 100 : 0) + "%";
      const mid = siteEl.scrollTop + siteEl.clientHeight * 0.38;
      let active = 0;
      SECTIONS.forEach((s, i) => { if (s.offsetTop <= mid) active = i; });
      btns.forEach((b, i) => b.classList.toggle("on", i === active));
    }
    siteEl.addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    onScroll();

    // —— 揭示：主动判定（不依赖 IntersectionObserver，任何环境都稳）——
    function revealPass() {
      const h = siteEl.clientHeight;
      const sr = siteEl.getBoundingClientRect();
      document.querySelectorAll(".rv:not(.in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        const top = r.top - sr.top, bottom = r.bottom - sr.top;
        if (bottom > -40 && top < h + 40) el.classList.add("in");
      });
    }
    siteEl.addEventListener("scroll", revealPass, { passive: true });
    addEventListener("resize", revealPass);
    requestAnimationFrame(revealPass);
    [120, 400, 1000, 1800].forEach((d) => setTimeout(revealPass, d));
    addEventListener("load", revealPass);
  })();

  /* ---------------------- 卡片 3D 倾斜 ---------------------- */
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      if (matchMedia("(hover:none)").matches) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", px * 100 + "%");
      card.style.setProperty("--my", py * 100 + "%");
      card.style.transform = "perspective(760px) rotateY(" + ((px - .5) * 9).toFixed(2) + "deg) rotateX(" + ((.5 - py) * 9).toFixed(2) + "deg) translateY(-4px)";
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });

  /* ---------------------- 磁吸按钮 ---------------------- */
  document.querySelectorAll(".btn").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      if (matchMedia("(hover:none)").matches || window.REDUCED) return;
      const r = b.getBoundingClientRect();
      b.style.translate = (((e.clientX - r.left) / r.width - .5) * 8).toFixed(1) + "px " + (((e.clientY - r.top) / r.height - .5) * 6).toFixed(1) + "px";
    });
    b.addEventListener("pointerleave", () => { b.style.translate = ""; });
  });

  /* ---------------------- 开灯 / 关灯（联动屋子昼夜） ---------------------- */
  function applyTheme(dark) {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    try { localStorage.setItem("site_theme", dark ? "dark" : "light"); localStorage.setItem("room_day", dark ? "0" : "1"); } catch (e) {}
    if (ready) applyDayNight(dark ? 0 : 1, clock.elapsedTime);
  }
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("site_theme"); } catch (e) {}
    document.documentElement.setAttribute("data-theme", saved ? saved : "dark");
  })();
  const themeBtn = document.getElementById("st-theme");
  if (themeBtn) themeBtn.addEventListener("click", () => applyTheme(document.documentElement.getAttribute("data-theme") !== "dark"));
  const soundBtn = document.getElementById("st-sound");
  if (soundBtn) soundBtn.addEventListener("click", () => {
    ensureRoom();
    if (!ready) return;
    toggleMusic();
    toast(Audio8.on ? "声音已开启" : "声音已关闭");
  });

  /* ---------------------- 3D 懒初始化 ---------------------- */
  function ensureRoom() {
    if (ready) return true;
    if (initing) return false;          // 防重入：three 场景只建一次
    initing = true;
    try { initThree(); }
    catch (e) {
      // 兜底：不让整屏遮罩挡住主页，只提示并把入口变灰
      try { console.error("[room] initThree 失败：", e && (e.stack || e.message || e)); } catch (_) {}
      initing = false;
      if (!retried) {                   // 首屏偶发失败（例如上下文被占用）：1.5 秒后自动再试一次
        retried = true;
        setTimeout(() => { try { ensureRoom(); } catch (_) {} }, 1500);
        return false;
      }
      if (typeof toast === "function") toast("这间屋子需要 WebGL，暂时进不去（主页照常逛）");
      document.querySelectorAll("#open-space,#open-space-2,#doorway,#door-big,[data-enter]").forEach((el) => {
        el.style.opacity = ".5"; el.style.pointerEvents = "none"; el.style.filter = "grayscale(.5)";
      });
      return false;
    }
    applyDayNight(document.documentElement.getAttribute("data-theme") === "dark" ? 0 : 1, 0);
    animate();
    cam.yaw = cam.gyaw = .9; cam.pitch = cam.gpitch = .42; cam.radius = cam.gradius = 11.5;
    cam.tx = cam.gtx = 1.2; cam.ty = cam.gty = 1.2; cam.tz = cam.gtz = -.5;
    initing = false;
    ready = true;
    // 安装 3D 扩展包（挂钟 / 鱼缸 / 吉他 / 窗台气象 / 纸飞机 / 地球仪）
    try { if (window.__site3) window.__site3.install(); } catch (e) { console.error("[room-ext] 安装失败：", e); }
    try { if (window.__site6) window.__site6.install(); } catch (e) { console.error("[room-ext2] 安装失败：", e); }
    return true;
  }

  /* ---------------------- 转场工具 ---------------------- */
  const root = document.documentElement;
  function setOrigin(el) {
    let x = innerWidth / 2, y = innerHeight / 2;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
    } else if (el && typeof el.x === "number") { x = el.x; y = el.y; }
    root.style.setProperty("--ox", x + "px");
    root.style.setProperty("--oy", y + "px");
    return { x, y };
  }
  function portalFlash(on) {
    const f = document.getElementById("portal-flash");
    if (f) f.classList.toggle("on", !!on);
  }

  /* ---------------------- 进门：门厅 → 3D 空间 ---------------------- */
  function enterSpace(origin) {
    if (busy || mode === "space") return;
    busy = true;
    setOrigin(origin);
    if (!ensureRoom()) { busy = false; return; }

    Audio8.init(); Audio8.creak();
    document.body.classList.add("warp");                       // 门厅塌缩进门
    tween({ dur: window.REDUCED ? 10 : 1100, ease: easeOut, onU: (e) => { room.doorPivot.rotation.y = -e * .5; },
      onC: () => tween({ dur: window.REDUCED ? 10 : 1500, ease: easeIO, onU: (e) => { room.doorPivot.rotation.y = lerp(-.5, 0, e); } }) });
    lampOn = false; applyDayNight(dayMix, 0);
    setTimeout(() => { Audio8.lampClick(); lampOn = true; applyDayNight(dayMix, clock.elapsedTime); }, window.REDUCED ? 40 : 880);
    setTimeout(() => portalFlash(1), window.REDUCED ? 10 : 880);
    flyTo(HOME, window.REDUCED ? 10 : 2600);                   // 运镜进屋

    setTimeout(() => {
      document.body.classList.replace("mode-site", "mode-space");
      siteEl.style.visibility = "hidden";
      document.body.classList.remove("warp");
      const tb = document.getElementById("topbar"), hint = document.getElementById("hint");
      if (tb) tb.classList.add("on");
      if (hint) { hint.classList.add("on"); setTimeout(() => hint.classList.remove("on"), 9000); }
      portalFlash(0);
      mode = "space";
      busy = false;
    }, window.REDUCED ? 120 : 1500);
  }

  /* ---------------------- 出门：3D 空间 → 门厅 ---------------------- */
  const OUTSIDE = { yaw: .9, pitch: .42, radius: 11.5, tx: 1.2, ty: 1.2, tz: -.5 };
  function exitSpace(origin) {
    if (busy || mode !== "space") return;
    busy = true;
    const o = origin || document.getElementById("st-enter");
    const p = setOrigin(o);

    Audio8.creak();
    tween({ dur: window.REDUCED ? 10 : 900, ease: easeOut, onU: (e) => { room.doorPivot.rotation.y = -e * .5; } });
    flyTo(OUTSIDE, window.REDUCED ? 10 : 1300, () => {
      tween({ dur: window.REDUCED ? 10 : 700, ease: easeIO, onU: (e) => { room.doorPivot.rotation.y = lerp(-.5, 0, e); } });
    });

    // 门厅从门外炸开
    siteEl.style.visibility = "visible";
    siteEl.style.transition = "none";
    siteEl.style.clipPath = "circle(0px at " + p.x + "px " + p.y + "px)";
    siteEl.style.transform = "scale(1.08)";
    siteEl.style.filter = "blur(10px) brightness(1.3)";
    siteEl.style.opacity = "1";
    void siteEl.offsetWidth;
    siteEl.style.transition = "clip-path 1.15s cubic-bezier(.22,.61,.36,1), transform 1.15s cubic-bezier(.22,.61,.36,1), filter .95s cubic-bezier(.22,.61,.36,1)";
    siteEl.style.clipPath = "circle(175% at " + p.x + "px " + p.y + "px)";
    siteEl.style.transform = "none";
    siteEl.style.filter = "none";

    setTimeout(() => {
      document.body.classList.replace("mode-space", "mode-site");
      siteEl.style.cssText = "";
      siteEl.scrollTo({ top: 0, behavior: "auto" });
      mode = "site";
      busy = false;
    }, window.REDUCED ? 150 : 1250);
  }

  /* ---------------------- 入口绑定 ---------------------- */
  ["#open-space", "#open-space-2", "#doorway", "#st-enter"].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener("click", (e) => enterSpace(e.currentTarget));
  });
  document.querySelectorAll("[data-enter]").forEach((el) =>
    el.addEventListener("click", (e) => enterSpace(e.currentTarget)));

  // 3D 顶栏：回门厅
  (function injectExitBtn() {
    const tools = document.getElementById("tools");
    if (tools && !document.getElementById("btn-exit")) {
      const b = document.createElement("button");
      b.className = "tbtn glass"; b.id = "btn-exit"; b.title = "回到门厅（Esc）";
      b.setAttribute("aria-label", "回到门厅");
      b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M21 12H10"/><path d="M13 8l-4 4 4 4"/></svg>';
      b.addEventListener("click", (e) => exitSpace(e.currentTarget));
      tools.insertBefore(b, tools.firstChild);
    }
  })();
  addEventListener("keydown", (e) => { if (e.key === "Escape" && mode === "space") exitSpace(); });

  /* ---------------------- 彩蛋：敲「cat」撸猫 ---------------------- */
  (function easterEgg() {
    let buf = "";
    addEventListener("keydown", (e) => {
      if (mode !== "site" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!/^[a-zA-Z]$/.test(e.key)) return;
      buf = (buf + e.key.toLowerCase()).slice(-3);
      if (buf !== "cat") return;
      buf = "";
      meow();
      const d = document.getElementById("doorway");
      if (d && d.animate) d.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 520, easing: "cubic-bezier(.34,1.56,.64,1)" });
      toast("喵 —— 屋里的猫说：进来坐坐？");
    });
    function meow() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC(), t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(760, t);
        o.frequency.exponentialRampToValueAtTime(430, t + .28);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.06, t + .04);
        g.gain.exponentialRampToValueAtTime(.0001, t + .34);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + .36);
        setTimeout(() => ctx.close(), 600);
      } catch (e) {}
    }
  })();

  /* ---------------------- 自测钩子（?selftest=enter / =exit 自动跑一遍） ---------------------- */
  (function selftest() {
    // 预览用：?goto=work|life|cta 直接滚到某段；?selftest=enter 自动推门
    const goto = new URLSearchParams(location.search).get("goto");
    if (goto) setTimeout(() => {
      const el = document.getElementById(goto === "cta" ? "portal-cta" : goto);
      if (el) el.scrollIntoView({ behavior: "auto", block: goto === "cta" ? "center" : "start" });
    }, 500);
    // 预览用：?demo=tank / guitar / clock / weather / plane / globe 自动触发该玩法
    const demo = new URLSearchParams(location.search).get("demo");
    if (demo) {
      const fire = () => {
        const R = window.__room;
        if (!R || !R.interact) return false;
        const h = R.interact.find((x) => x.id === demo);
        if (!h) return false;
        try { h.action(h); } catch (e) { console.error(e); }
        return true;
      };
      // 必须等"推门飞行"彻底结束再触发，否则会被入门运镜覆盖（这就是之前 demo 看不到效果的原因）
      let readyAt = 0, fired = false, waited = 0;
      const timer = setInterval(() => {
        if (fired) { clearInterval(timer); return; }
        waited += 300;
        if (waited > 20000) { clearInterval(timer); return; }
        const S = window.__site;
        if (!S || S.mode !== "space" || S.busy) { readyAt = 0; return; }
        if (!readyAt) { readyAt = Date.now(); return; }        // 过渡刚结束，再稳 700ms
        if (Date.now() - readyAt < 700) return;
        if (fire()) { fired = true; clearInterval(timer); }
      }, 300);
    }
    const q = new URLSearchParams(location.search).get("selftest");
    if (!q) return;
    setTimeout(() => {
      if (q === "enter") enterSpace(document.getElementById("open-space"));
      else if (q === "exit") { ensureRoom(); enterSpace(document.getElementById("open-space")); }
    }, 900);
  })();

  /* ---------------------- 门厅为默认模式 + 对外接口 ---------------------- */
  document.body.classList.add("mode-site");
  window.__site = {
    get mode() { return mode; },
    get ready() { return ready; },
    get busy() { return busy; },
    enter: enterSpace,
    exit: exitSpace,
    ensureRoom,
  };
})();
