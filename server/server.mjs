/* ==================================================================
   陈启粤的个人网站 —— 静态托管 + 访客计数（单文件 · 零依赖）
   v3：gzip/brotli + ETag 304 + 分级缓存 + **HTTPS**(自动检测证书) + 隐藏文件保护
   ------------------------------------------------------------------
   启动：node server.mjs
   环境变量：
     PORT      监听端口（默认 8790）
     HOST      监听地址（默认 0.0.0.0）
     SITE_DIR  静态目录（默认 = 本文件上一级）
     DATA_FILE 计数数据（默认 ./data/visits.json）
     TLS_DIR   证书目录（默认 <SITE_DIR>/.certs），有 fullchain.pem + privkey.pem 就走 HTTPS
   ================================================================== */
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8790);
const HOST = process.env.HOST || "0.0.0.0";
const SITE_DIR = path.resolve(HERE, process.env.SITE_DIR || "..");
const DATA_FILE = path.resolve(HERE, process.env.DATA_FILE || "./data/visits.json");
const TLS_DIR = path.resolve(HERE, process.env.TLS_DIR || path.join(SITE_DIR, ".certs"));

const MAX_SIDS = 20000, MAX_SAFE_SID = 64, KEEP_DAYS = 400;

/* ------------------------- 计数数据 ------------------------- */
let db = { pv: 0, sids: [], seen: {}, days: {} };
let sidSet = new Set();
function load() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    db = { pv: d.pv || 0, sids: Array.isArray(d.sids) ? d.sids : [], seen: d.seen || {}, days: d.days || {} };
    sidSet = new Set(db.sids);
    console.log(`[data] 载入 -> 累计 ${db.sids.length} 人 / ${db.pv} 次`);
  } catch (e) { console.log(`[data] 新建统计文件（${e.code || e.message}）`); }
}
let saveTimer = null;
function saveSoon() { if (!saveTimer) saveTimer = setTimeout(() => { saveTimer = null; saveNow(); }, 2500); }
function saveNow() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify({ ...db, updated: new Date().toISOString() }), "utf8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) { console.error("[data] 写入失败:", e.message); }
}
function trim() {
  if (db.sids.length > MAX_SIDS) {
    const drop = db.sids.splice(0, db.sids.length - MAX_SIDS);
    drop.forEach((s) => { sidSet.delete(s); delete db.seen[s]; });
  }
  const keys = Object.keys(db.days).sort();
  if (keys.length > KEEP_DAYS) keys.slice(0, keys.length - KEEP_DAYS).forEach((k) => delete db.days[k]);
}
function todayKey() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function stats() {
  const day = db.days[todayKey()] || { uv: 0, pv: 0 };
  return { count: db.sids.length, pv: db.pv, todayUv: day.uv, todayPv: day.pv };
}
function hit(rawSid) {
  const sid = typeof rawSid === "string" && rawSid.length > 0 && rawSid.length <= MAX_SAFE_SID ? rawSid : "";
  const k = todayKey();
  const day = (db.days[k] = db.days[k] || { uv: 0, pv: 0, sids: [] });
  let isNew = false;
  db.pv++; day.pv++;
  if (sid) {
    if (!sidSet.has(sid)) {
      sidSet.add(sid); db.sids.push(sid); day.sids.push(sid);
      if (day.sids.length > MAX_SIDS) day.sids.splice(0, day.sids.length - MAX_SIDS);
      day.uv++; isNew = true;
    }
    db.seen[sid] = (db.seen[sid] || 0) + 1;
  }
  trim(); saveSoon();
  return { ...stats(), isNew, mine: sid ? db.seen[sid] : 0 };
}

/* ------------------------- 限流 ------------------------- */
const buckets = new Map();
function limited(ip) {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.t > 60000) { b = { n: 0, t: now }; buckets.set(ip, b); }
  b.n++;
  if (buckets.size > 5000) buckets.clear();
  return b.n > 120;
}

/* ------------------------- 静态资源 ------------------------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon",
  ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".webm": "video/webm",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream",
  ".wasm": "application/wasm", ".map": "application/json; charset=utf-8"
};
const COMPRESSIBLE = /\.(html?|js|mjs|css|json|svg|txt|map|webmanifest)$/i;
const zCache = new Map();

function sendJSON(res, obj, code = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(req, res, ext, cc, etag, body, enc) {
  const h = {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": cc,
    etag,
    vary: "accept-encoding",
    "access-control-allow-origin": "*",
    "content-length": body.length
  };
  if (enc) h["content-encoding"] = enc;
  res.writeHead(200, h);
  if (req.method === "HEAD") { res.end(); return; }
  res.end(body);
}

function serveStatic(req, res, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split("?")[0]); } catch (e) { res.writeHead(400).end("bad path"); return; }
  // 隐藏文件/目录一律不可访问（.certs、.cf-token 等）
  if (/(^|\/)\./.test(p)) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("404"); return; }
  if (p.endsWith("/")) p += "index.html";
  const file = path.resolve(SITE_DIR, "." + p);
  if (!file.startsWith(SITE_DIR)) { res.writeHead(403).end("forbidden"); return; }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      const idx = path.join(SITE_DIR, "index.html");
      fs.readFile(idx, (e2, buf) => {
        if (e2) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("404"); return; }
        sendFile(req, res, ".html", "no-cache", 'W/"idx"', buf, null);
      });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const cc = ext === ".html" ? "no-cache" : "public, max-age=604800";
    const etag = 'W/"' + st.size.toString(16) + "-" + Math.floor(st.mtimeMs).toString(16) + '"';
    if (req.headers["if-none-match"] === etag) {
      return res.writeHead(304, { etag, "cache-control": cc, vary: "accept-encoding", "access-control-allow-origin": "*" }).end();
    }
    fs.readFile(file, (e3, buf) => {
      if (e3) { res.writeHead(500).end("read error"); return; }
      let enc = null;
      if (COMPRESSIBLE.test(file) && buf.length <= 2 * 1024 * 1024) {
        const key = file + ":" + st.mtimeMs;
        let c = zCache.get(key);
        if (!c) {
          try {
            c = { gz: zlib.gzipSync(buf, { level: 6 }), br: zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }) };
          } catch (e4) { c = null; }
          if (c) { if (zCache.size > 200) zCache.clear(); zCache.set(key, c); }
        }
        const ae = String(req.headers["accept-encoding"] || "");
        if (c) {
          if (c.br && /\bbr\b/.test(ae)) { buf = c.br; enc = "br"; }
          else if (c.gz && /\bgzip\b/.test(ae)) { buf = c.gz; enc = "gzip"; }
        }
      }
      sendFile(req, res, ext, cc, etag, buf, enc);
    });
  });
}

/* ------------------------- 请求处理 ------------------------- */
function handle(req, res) {
  const u = new URL(req.url, "http://x");
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,HEAD,OPTIONS",
      "access-control-allow-headers": "*",
      "access-control-max-age": "86400"
    });
    return res.end();
  }
  if (u.pathname === "/health") return sendJSON(res, { ok: true });
  if (u.pathname === "/api/hit" || u.pathname === "/api/count") {
    if (limited(ip)) return sendJSON(res, { error: "too many requests" }, 429);
    if (req.method !== "GET" && req.method !== "HEAD") return sendJSON(res, { error: "method" }, 405);
    return sendJSON(res, u.pathname === "/api/hit" ? hit(u.searchParams.get("sid")) : stats());
  }
  serveStatic(req, res, u.pathname);
}

/* ------------------------- 启动：有证书就 HTTPS ------------------------- */
function readCert() {
  try {
    const key = fs.readFileSync(path.join(TLS_DIR, "privkey.pem"));
    const cert = fs.readFileSync(path.join(TLS_DIR, "fullchain.pem"));
    if (!key.length || !cert.length) return null;
    return { key, cert };
  } catch (e) { return null; }
}

load();
const initialCert = readCert();
let tlsOn = false;
let server;
if (initialCert) {
  server = https.createServer({ key: initialCert.key, cert: initialCert.cert, minVersion: 'TLSv1.2' }, handle);
  tlsOn = true;
  console.log('[tls] HTTPS enabled (cert dir ' + TLS_DIR + ')');
} else {
  server = http.createServer(handle);
  console.log('[tls] no certificate found, plain HTTP (drop cert into ' + TLS_DIR + ' and restart)');
}

/* --- auto renew (acme.sh DNS-01 + hot cert reload) --- */
const TLS_DOMAIN = process.env.TLS_DOMAIN || 'example.com';
const RENEW_DIR = path.join(SITE_DIR, '.acme');
const ACME_SH = path.join(RENEW_DIR, 'acme.sh');

function reloadCert() {
  if (!tlsOn) return;
  const c = readCert();
  if (!c) return;
  try { server.setSecureContext({ key: c.key, cert: c.cert }); console.log('[tls] certificate reloaded'); } catch (e) { console.error('[tls] reload failed ' + e.message); }
}

function runRenewal() {
  if (!fs.existsSync(ACME_SH)) { console.log('[renew] acme.sh not found, skip'); return; }
  try {
    const env = Object.assign({}, process.env, { LE_WORKING_DIR: RENEW_DIR });
    const out = execFileSync('sh', [ACME_SH, '--cron', '--home', RENEW_DIR], { env: env, encoding: 'utf8', timeout: 300000 });
    const txt = String(out || '').trim();
    console.log('[renew] ' + (txt ? txt.split('\n').slice(-1)[0] : 'done'));
    if (!/Skipping|Next renewal time/i.test(txt)) {
      execFileSync('sh', [ACME_SH, '--install-cert', '-d', TLS_DOMAIN, '--ecc', '--server', 'letsencrypt', '--key-file', path.join(TLS_DIR, 'privkey.pem'), '--fullchain-file', path.join(TLS_DIR, 'fullchain.pem')], { env: env, encoding: 'utf8', timeout: 120000 });
      console.log('[renew] new certificate installed into ' + TLS_DIR);
      reloadCert();
    }
  } catch (e) {
    console.error('[renew] error: ' + String((e && (e.stdout || e.message)) || e).slice(-400));
  }
}

server.listen(PORT, HOST, () => {
  const scheme = tlsOn ? 'https' : 'http';
  console.log('[ok] site + visitor counter started (gzip/brotli + ETag304' + (tlsOn ? ' + HTTPS + auto-renew' : '') + ')');
  console.log('     local  : ' + scheme + '://127.0.0.1:' + PORT + '/');
  console.log('     static : ' + SITE_DIR);
});
['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => { saveNow(); console.log('[exit] data saved'); process.exit(0); }));
if (tlsOn) {
  setTimeout(runRenewal, 180000);
  setInterval(runRenewal, 43200000);
  setInterval(reloadCert, 300000);
  console.log('[renew] auto renew enabled: checks every 12h (' + RENEW_DIR + ')');
}
