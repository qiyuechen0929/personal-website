/* ==================================================================
   访客计数：你是第几位来到这间屋子的人
   —  由 Ekko 追加，独立 IIFE（只暴露 window.__visit 便于自测）

   两种模式（自动切换，无需改前端逻辑）：
     1) 接后端：CONFIG.visitor.api 有值时 → GET {api}?sid=xxx
        返回 { count, pv, todayUv, todayPv, isNew, mine }
        · count = 全站累计"人数"（不同设备数）→ 就是"你是第几位"
        同域部署（server.mjs 同时托管本站）直接写 "/api/hit"
     2) 兜底：没配接口 / 接口挂了 → 本机 localStorage 计数
        （每台设备自己数，仍能正常显示，绝不空白、绝不报错）
   ================================================================== */
(function () {
  var siteEl = document.getElementById("site");
  if (!siteEl || /[?&]visit=off/.test(String(location.search || ""))) return;

  var cfg = (function () {
    try { return (typeof CONFIG !== "undefined" && CONFIG && CONFIG.visitor) || {}; } catch (e) { return {}; }
  })();
  var API = (cfg.api || "").trim();
  /* 自测/离线钩子：?visit=local 强制本机计数；?visit=off 不显示 */
  var Q = String(location.search || "");
  if (/[?&]visit=local/.test(Q)) API = "";
  if (/[?&]visit=off/.test(Q)) { window.__visitOff = 1; }
  var REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var K = { sid: "vp_sid", total: "vp_total", visits: "vp_visits", dot: "vp_dot" };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function fmt(n) { try { return Number(n).toLocaleString("zh-CN"); } catch (e) { return String(n); } }

  /* 设备标识：只用来算"第几位人"，不含任何个人信息 */
  var sid = lsGet(K.sid);
  if (!sid) { sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); lsSet(K.sid, sid); }

  /* 这是你第几次来（本机） */
  var visits = parseInt(lsGet(K.visits) || "0", 10) || 0;
  if (ssGet(K.dot) !== "1") { visits++; lsSet(K.visits, String(visits)); ssSet(K.dot, "1"); }

  /* ---------------- 轻响（复用同一套静音开关） ---------------- */
  var actx = null;
  function soundOn() { try { return localStorage.getItem("site_sound") !== "0"; } catch (e) { return true; } }
  function tick(up) {
    if (!soundOn()) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume();
      var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(up ? 660 : 880, t);
      o.frequency.exponentialRampToValueAtTime(up ? 1320 : 1180, t + .09);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.016, t + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + .13);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .15);
    } catch (e) {}
  }

  /* ---------------- DOM ---------------- */
  var hero = document.createElement("div");
  hero.id = "visit-hero";
  hero.className = "rv d3";
  hero.innerHTML = '<span class="vc-dot"></span><span>你是第 <b class="vc-num">···</b> 位来到这里的人</span><span class="vc-sub"></span>';

  var pill = document.createElement("div");
  pill.id = "visit-pill";
  pill.innerHTML = '<span class="vc-dot"></span><b class="vc-num">···</b><span>位访客</span><span class="vc-sep vc-extra">·</span><span class="vc-extra">今天 <b class="vc-today">—</b> 人</span>';

  var cta = document.querySelector("#open-space");
  var row = cta ? cta.closest(".cta-row") : null;
  if (row && row.parentNode) row.parentNode.insertBefore(hero, row.nextSibling);
  else (document.querySelector("#hero .left") || siteEl).appendChild(hero);
  (document.body || siteEl).appendChild(pill);

  var numHero = hero.querySelector(".vc-num"), sub = hero.querySelector(".vc-sub");
  var numPill = pill.querySelector(".vc-num"), todayPill = pill.querySelector(".vc-today");
  var heroNum = 0;

  /* ---------------- 数字滚动 ---------------- */
  function roll(el, to) {
    if (!el) return;
    if (REDUCED) { el.textContent = fmt(to); return; }
    var from = Math.max(0, to - Math.max(6, Math.round(to * .05)));
    var t0 = performance.now(), dur = 1150;
    function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
      else { el.textContent = fmt(to); el.classList.add("pop"); }
    }
    requestAnimationFrame(step);
  }

  function paint(d) {
    if (d.count === heroNum) { if (d.todayUv != null) todayPill.textContent = fmt(d.todayUv); return; }
    heroNum = d.count;
    roll(numHero, d.count); roll(numPill, d.count);

    var bits = [];
    if (d.local) {
      bits.push("本机计数 · 接上服务器后自动变全站实时");
    } else {
      if (d.todayUv != null) bits.push("今天来了 " + fmt(d.todayUv) + " 人");
      if (d.pv != null) bits.push("这间屋子被推开过 " + fmt(d.pv) + " 次");
      bits.push("这是你第 " + fmt(d.mine || visits) + " 次来");
    }
    sub.textContent = bits.join(" · ");
    if (d.todayUv != null) todayPill.textContent = fmt(d.todayUv);
    setTimeout(function () { tick(true); }, 1050);
    setTimeout(function () { pill.classList.add("on"); }, 700);
  }

  /* ---------------- 兜底：本机计数 ---------------- */
  function localCount() {
    var t = parseInt(lsGet(K.total) || String(cfg.localBase || 0), 10) || 0;
    if (ssGet(K.dot) !== "1" || !API) {
      if (ssGet(K.totaled) !== "1") { t++; lsSet(K.total, String(t)); ssSet(K.totaled, "1"); }
    }
    paint({ count: Math.max(t, 1), local: true, mine: visits });
  }

  /* ---------------- 走接口 ---------------- */
  function load() {
    if (!API) { localCount(); return; }
    var url = API + (API.indexOf("?") < 0 ? "?" : "&") + "sid=" + encodeURIComponent(sid);
    var ctl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
    fetch(url, { cache: "no-store", signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        clearTimeout(timer);
        if (!d || typeof d.count !== "number") throw new Error("bad payload");
        paint({
          count: d.count, pv: d.pv, todayUv: d.todayUv,
          mine: d.mine, isNew: d.isNew
        });
      })
      .catch(function () { clearTimeout(timer); localCount(); });
  }

  window.__visit = {
    get api() { return API; },
    get sid() { return sid; },
    get visits() { return visits; },
    get count() { return heroNum; },
    reload: load
  };

  load();
})();
