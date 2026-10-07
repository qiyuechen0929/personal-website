/* ==================================================================
   Ekko 追加 · 2D 玩法升级包 v2（独立 IIFE，只暴露 window.__explore）
   1) 探索成就：2D 区段 + 3D 热区，进度徽章 / 清单 / 集齐彩带
   2) 隐藏小游戏「抓 Bug」：上上下下左右左右 BA
   3) 导航切换的"开门"过场
   4) 进门时"穿过门框"的镜头
   5) 按真实时间自动决定明暗（夜里落地就是夜色）
   ================================================================== */
(function () {
  const siteEl = document.getElementById("site");
  if (!siteEl) return;
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s) => document.querySelector(s);
  const Q = String(location.search || "");
  const TESTMODE = /[?&](selftest|demo|goto)=/.test(Q);

  /* ---------------- 小音效（跟随网站的音效开关） ---------------- */
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

  /* ---------------- 小 toast ---------------- */
  let toastEl = document.getElementById("toast");
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "toast";
      toastEl.style.cssText = "position:fixed;left:50%;bottom:38px;transform:translate(-50%,20px);z-index:9800;padding:12px 20px;border-radius:14px;font-size:13.5px;max-width:82vw;text-align:center;opacity:0;transition:opacity .35s, transform .35s;background:rgba(16,19,28,.9);border:1px solid rgba(255,255,255,.14);color:#e9edf7;backdrop-filter:blur(14px)";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(() => { toastEl.style.opacity = "1"; toastEl.style.transform = "translate(-50%,0)"; });
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toastEl.style.opacity = "0"; toastEl.style.transform = "translate(-50%,20px)"; }, 3400);
  }

  /* ==================================================================
     一、探索成就（2D 与 3D 共用一份进度）
     ================================================================== */
  const BASE_ITEMS = [
    { k: "sec:hero", t: "走进门厅" },
    { k: "sec:about", t: "读一读「关于」" },
    { k: "sec:work", t: "翻翻桌子上的作品" },
    { k: "sec:life", t: "看一眼书架与爱好" },
    { k: "sec:contact", t: "敲敲窗（联系方式）" },
    { k: "sec:thinking", t: "读「写在 X 上的思考」" },
    { k: "act:cat", t: "撸一下门厅角落的猫" },
    { k: "act:theme", t: "开一次灯 / 关一次灯" },
    { k: "act:sound", t: "打开或关掉声音" },
    { k: "act:entry", t: "走到门的另一边（进 3D 房间）" },
    { k: "act:konami", t: "输入 ↑↑↓↓←→←→ B A" },
    { k: "act:game", t: "玩一局「抓 Bug」" }
  ];
  let hotItems = [];
  const KEY = "ekko_explore_v1";
  let got = [];
  try { got = JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { got = []; }
  const has = (k) => got.indexOf(k) >= 0;
  const listeners = [];

  window.__explore = {
    has,
    mark(k) {
      if (!k || has(k)) return false;
      got.push(k);
      try { localStorage.setItem(KEY, JSON.stringify(got)); } catch (e) {}
      const base = got.filter((x) => x.indexOf("hot:") !== 0).length;
      if (base === BASE_ITEMS.length && hotItems.length && got.filter((x) => x.indexOf("hot:") === 0).length === hotItems.length) fire("all");
      fire("change");
      return true;
    },
    setHotspots(list) { hotItems = list || []; fire("change"); },
    get count() { return got.length; },
    get total() { return BASE_ITEMS.length + hotItems.length; },
    get items() { return BASE_ITEMS.concat(hotItems); },
    get done() { return hotItems.length > 0 && got.length >= BASE_ITEMS.length + hotItems.length; },
    on(fn) { listeners.push(fn); },
    reset() { got = []; try { localStorage.setItem(KEY, "[]"); } catch (e) {} fire("change"); }
  };
  function fire(what) { listeners.forEach((f) => { try { f(what); } catch (e) {} }); }

  /* ==================================================================
     二、进度徽章 + 探索清单 + 彩带
     ================================================================== */
  const badge = document.createElement("div");
  badge.id = "explore";
  badge.setAttribute("role", "button");
  badge.title = "探索进度 · 点开看还差什么";
  badge.innerHTML = '<span>🧭 已发现</span><b class="ex-n">0</b><span class="ex-bar"><i></i></span>';
  document.body.appendChild(badge);

  const list = document.createElement("div");
  list.id = "explore-list";
  list.innerHTML = '<button class="ex-close" aria-label="关闭">×</button><h4>屋里的秘密</h4><div class="ex-sub"></div><div class="ex-body"></div><div class="ex-note"></div>';
  document.body.appendChild(list);
  list.querySelector(".ex-close").addEventListener("click", () => list.classList.remove("on"));

  const canvas = document.createElement("canvas");
  canvas.id = "confetti";
  document.body.appendChild(canvas);

  function render() {
    const items = window.__explore.items;
    const n = window.__explore.count, tot = window.__explore.total;
    badge.querySelector(".ex-n").textContent = n + "/" + tot;
    badge.querySelector(".ex-bar i").style.width = tot ? (n / tot * 100).toFixed(1) + "%" : "0%";
    badge.classList.toggle("done", window.__explore.done);
    list.querySelector(".ex-sub").textContent = "已经找到 " + n + " / " + tot + " 个" + (window.__explore.done ? " —— 全部集齐了 🎉" : "");
    list.querySelector(".ex-body").innerHTML = items.map((it) =>
      '<div class="ex-row' + (has(it.k) ? " on" : "") + '"><span class="tick">' + (has(it.k) ? "✓" : "") + "</span>" +
      "<span>" + (has(it.k) ? it.t : (it.hint || "？？？")) + "</span></div>").join("");
    list.querySelector(".ex-note").innerHTML =
      '小声提示：门厅每个区段滑到底都会点亮；屋里的发光物件每件都算一个（<b>' + hotItems.length + '</b> 件）。<br>' +
      (has("act:game") ? "" : '还有个小游戏藏着 —— 在电脑上试试 <b>上上下下左右左右 BA</b>。') +
      '<div style="margin-top:12px"><button class="ex-close" id="ex-play" style="position:static;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:7px 13px;font-size:12.5px;color:inherit">▸ 现在玩一局「抓 Bug」</button>' +
      (window.__explore.count ? ' <button class="ex-close" id="ex-reset" style="position:static;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:7px 13px;font-size:12.5px;color:inherit">重来</button>' : "") + "</div>";
    const play = list.querySelector("#ex-play");
    if (play) play.addEventListener("click", () => { list.classList.remove("on"); startGame(); });
    const rs = list.querySelector("#ex-reset");
    if (rs) rs.addEventListener("click", () => { window.__explore.reset(); render(); });
  }
  window.__explore.on(render);
  window.__explore.on((what) => { if (what === "all") confetti(); });
  render();

  badge.addEventListener("click", () => { list.classList.toggle("on"); beep(880, .08, "triangle", .02); });

  function confetti() {
    const ctx = canvas.getContext("2d");
    canvas.width = innerWidth; canvas.height = innerHeight;
    canvas.classList.add("on");
    const cols = ["#f0a35e", "#7ee0a8", "#8ab4ff", "#ffd166", "#ff8fa3"];
    const ps = new Array(140).fill(0).map(() => ({
      x: innerWidth / 2 + (Math.random() - .5) * 220, y: innerHeight * .42,
      vx: (Math.random() - .5) * 9, vy: -Math.random() * 11 - 4,
      s: 3 + Math.random() * 5, c: cols[(Math.random() * cols.length) | 0], r: Math.random() * 6, vr: (Math.random() - .5) * .3
    }));
    let t0 = performance.now();
    beep(660, .18, "triangle", .04, 990); setTimeout(() => beep(990, .3, "sine", .035, 1320), 140);
    (function step(now) {
      const dt = Math.min((now - t0) / 1000, .05); t0 = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach((p) => {
        p.vy += 26 * dt; p.x += p.vx * dt * 8; p.y += p.vy * dt * 8; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore();
      });
      if (ps.some((p) => p.y < innerHeight + 40)) requestAnimationFrame(step);
      else { canvas.classList.remove("on"); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    })(performance.now());
    setTimeout(() => toast("秘密全被你翻出来了 —— 这间屋子没有别的了 🎉"), 500);
  }

  /* ==================================================================
     三、2D 区段 & 交互点亮
     ================================================================== */
  (function watchSections() {
    const secs = ["hero", "about", "work", "life", "contact", "thinking"];
    const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > .35) window.__explore.mark("sec:" + e.target.id); });
    }, { threshold: [.35, .6] }) : null;
    secs.forEach((id) => { const el = document.getElementById(id); if (el && io) io.observe(el); });
    if (!io) secs.forEach((id) => window.__explore.mark("sec:" + id));
    addEventListener("scroll", () => {
      if (innerHeight + scrollY >= document.body.scrollHeight - 40) {
        window.__explore.mark("sec:contact"); window.__explore.mark("sec:thinking");
      }
    }, { passive: true });
  })();

  ["#st-theme", "#st-sound", "#st-enter", "#open-space", "#open-space-2"].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener("click", () => {
      if (sel === "#st-theme") window.__explore.mark("act:theme");
      if (sel === "#st-sound") window.__explore.mark("act:sound");
      if (sel === "#st-enter" || sel === "#open-space" || sel === "#open-space-2") window.__explore.mark("act:entry");
    });
  });
  const pet = $("#pet");
  if (pet) pet.addEventListener("click", () => window.__explore.mark("act:cat"));

  /* ==================================================================
     四、导航「开门」过场 + 进门「穿过门框」
     ================================================================== */
  const wipe = document.createElement("div");
  wipe.id = "nav-wipe";
  document.body.appendChild(wipe);
  function navWipe() {
    wipe.classList.remove("on"); void wipe.offsetWidth; wipe.classList.add("on");
    beep(520, .16, "sine", .02, 900);
  }
  document.querySelectorAll("#rooms button, #to-work, .card").forEach((b) => {
    b.addEventListener("click", () => { if (!REDUCED) navWipe(); });
  });

  ["#open-space", "#open-space-2", "#doorway", "#st-enter"].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener("pointerdown", () => {
      if (REDUCED) return;
      siteEl.classList.add("door-dive");
      setTimeout(() => siteEl.classList.remove("door-dive"), 1300);
      beep(1200, .22, "sine", .03, 220);
    }, true);
  });

  /* ==================================================================
     五、按真实时间决定明暗（只影响首次访问，之后听你的）
     ================================================================== */
  (function timeTheme() {
    let seen = false;
    try { seen = localStorage.getItem("ekko_first_visit") === "1"; } catch (e) {}
    const h = new Date().getHours();
    const night = h < 6.5 || h >= 19;
    if (!seen) {
      try { localStorage.setItem("ekko_first_visit", "1"); } catch (e) {}
      if (night) setTimeout(() => {
        const th = $("#st-theme");
        const cur = document.documentElement.getAttribute("data-theme");
        if (th && cur !== "dark") th.click();
        setTimeout(() => toast("现在是 " + h + " 点 · 屋里也给你留了夜灯"), 1400);
      }, 2600);
    }
  })();

  /* ==================================================================
     六、隐藏小游戏「抓 Bug」
     ================================================================== */
  const game = document.createElement("div");
  game.id = "buggame";
  game.innerHTML = '<canvas></canvas><div id="bug-hud"><span>得分<b data-s>0</b></span><span>剩余<b data-l>3</b></span><span>最佳<b data-b>0</b></span></div><button id="bug-quit">退出 (Esc)</button><div id="bug-title">点点点，把掉下来的 BUG 全敲掉 · ☕ 是加分道具</div>';
  document.body.appendChild(game);
  const gcv = game.querySelector("canvas"), gctx = gcv.getContext("2d");
  let gRun = false, gScore = 0, gLife = 3, gBest = +(localStorage.getItem("ekko_bug_best") || 0), gT0 = 0, gItems = [], gRaf = 0;
  const GLYPHS = [
    { t: "🐛", p: 1, c: "#8de0a8" }, { t: "🐛", p: 1, c: "#8de0a8" }, { t: "🐛", p: 1, c: "#8de0a8" },
    { t: "NaN", p: 1, c: "#ff9f9f" }, { t: "</>", p: 1, c: "#9fc9ff" }, { t: "undefined", p: 1, c: "#ffd166" },
    { t: "null", p: 1, c: "#c9a9ff" }, { t: "☕", p: 3, c: "#ffcf8f" }
  ];
  game.querySelector("[data-b]").textContent = gBest;

  function gSpawn() {
    const g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
    gItems.push({ x: 40 + Math.random() * (gcv.width - 80), y: -30, vy: 46 + Math.random() * 70, s: 20 + Math.random() * 12, g, rot: (Math.random() - .5) });
  }
  function gLoop(now) {
    if (!gRun) return;
    const dt = Math.min((now - gT0) / 1000, .05); gT0 = now;
    gctx.clearRect(0, 0, gcv.width, gcv.height);
    if (Math.random() < .022 + Math.min(.02, gScore / 4000)) gSpawn();
    let lost = 0;
    gItems = gItems.filter((it) => {
      it.y += it.vy * dt; it.vy += 12 * dt; it.rot += dt * .8;
      if (it.y > gcv.height + 30) { if (it.g.p === 1) lost++; return false; }
      gctx.save(); gctx.translate(it.x, it.y); gctx.rotate(Math.sin(it.rot) * .25);
      gctx.font = "600 " + it.s + "px system-ui, 'Segoe UI', sans-serif";
      gctx.fillStyle = it.g.c; gctx.textAlign = "center"; gctx.textBaseline = "middle";
      gctx.shadowColor = it.g.c; gctx.shadowBlur = 12;
      gctx.fillText(it.g.t, 0, 0); gctx.restore();
      return true;
    });
    if (lost) { gLife -= lost; game.querySelector("[data-l]").textContent = Math.max(0, gLife); beep(160, .18, "square", .03, 90); }
    if (gLife <= 0) return endGame();
    gRaf = requestAnimationFrame(gLoop);
  }
  function hit(px, py) {
    for (let i = gItems.length - 1; i >= 0; i--) {
      const it = gItems[i];
      if (Math.hypot(px - it.x, py - it.y) < it.s * .8) {
        gItems.splice(i, 1);
        gScore += it.g.p === 3 ? 5 : 1;
        game.querySelector("[data-s]").textContent = gScore;
        beep(it.g.p === 3 ? 1320 : 880, .07, "triangle", .025, it.g.p === 3 ? 1760 : 1180);
        if (it.g.p === 3) { gLife++; game.querySelector("[data-l]").textContent = gLife; }
        return true;
      }
    }
    return false;
  }
  gcv.addEventListener("pointerdown", (e) => {
    const r = gcv.getBoundingClientRect();
    if (!hit(e.clientX - r.left, e.clientY - r.top)) { gScore = Math.max(0, gScore - 1); game.querySelector("[data-s]").textContent = gScore; beep(220, .06, "sawtooth", .02); }
  });
  function startGame() {
    if (gRun) return;
    gRun = true; gScore = 0; gLife = 3; gItems = [];
    gcv.width = innerWidth; gcv.height = innerHeight;
    game.querySelector("[data-s]").textContent = "0";
    game.querySelector("[data-l]").textContent = "3";
    game.classList.add("on");
    window.__explore.mark("act:game");
    gT0 = performance.now();
    gRaf = requestAnimationFrame(gLoop);
  }
  function endGame() {
    gRun = false; cancelAnimationFrame(gRaf);
    if (gScore > gBest) { gBest = gScore; try { localStorage.setItem("ekko_bug_best", String(gBest)); } catch (e) {} }
    game.querySelector("[data-b]").textContent = gBest;
    gItems = []; gctx.clearRect(0, 0, gcv.width, gcv.height);
    game.classList.remove("on");
    toast(gScore >= 25 ? "抓 Bug 高手：这一局 " + gScore + " 分 🏆" : "这局抓掉 " + gScore + " 个 Bug（最佳 " + gBest + "）");
    beep(520, .5, "triangle", .03, 300);
  }
  game.querySelector("#bug-quit").addEventListener("click", endGame);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && gRun) endGame(); });

  (function konami() {
    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let i = 0;
    addEventListener("keydown", (e) => {
      if (gRun) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[i]) {
        i++;
        if (i === seq.length) {
          i = 0;
          window.__explore.mark("act:konami");
          beep(660, .1, "square", .03, 1320);
          setTimeout(startGame, 260);
        }
      } else i = (k === seq[0]) ? 1 : 0;
    });
  })();

  /* 演示 / 自测钩子：?game=1 直接开小游戏 */
  if (/[?&]game=1\b/.test(Q)) setTimeout(startGame, 900);

  window.__site5 = { toast, startGame, get playing() { return gRun; } };
  console.log("[site5] 探索成就 / 抓 Bug / 导航过场 / 穿过门框 / 时间感知 已就绪");
})();
