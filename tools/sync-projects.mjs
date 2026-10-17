#!/usr/bin/env node
/* ==================================================================
   「作品」区自动同步 —— 把 GitHub 仓库数据写进页面
   ------------------------------------------------------------------
   用途：让个人主页的作品列表自动跟着 GitHub 走。
   · 手写的中文名称/简介优先（配置里的 curated），其余字段从 GitHub 取
   · 可自动追加其它「有真实简介」的仓库（autoAppend）
   · 幂等：数据没变化就不写文件
   · 安全：写前自动备份，产物做语法校验，校验失败绝不覆盖

   用法：
     node tools/sync-projects.mjs                    # 用同目录的 sync-projects.config.json
     node tools/sync-projects.mjs path/to/其他配置.json

   每天自动跑（crontab -e，注意用绝对路径）：
     10 4 * * * /usr/bin/node /path/to/tools/sync-projects.mjs >/dev/null 2>&1

   配置文件字段见 tools/sync-projects.config.example.json
   ================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CFG = process.argv[2] || path.join(HERE, 'sync-projects.config.json');
if (!fs.existsSync(CFG)) {
  console.error('找不到配置文件：' + CFG + '\n先复制 tools/sync-projects.config.example.json 再改。');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));
const LOG = cfg.logFile || path.join(path.dirname(CFG), 'sync-projects.log');

const buf = [];
const log = (m) => { const s = '[' + new Date().toISOString().replace('T', ' ').slice(0, 19) + '] ' + m; buf.push(s); console.log(s); };
const flush = (code) => {
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, buf.join('\n') + '\n'); } catch {}
  process.exit(code || 0);
};
const die = (m) => { log('中止：' + m); flush(1); };

const IDX = cfg.siteIndex;
if (!IDX) die('配置里缺少 siteIndex（index.html 的绝对路径）');
if (!fs.existsSync(IDX)) die('找不到 ' + IDX);
let html = fs.readFileSync(IDX, 'utf8');

/* ---------- 1) 拉 GitHub ---------- */
let repos;
try {
  const r = await fetch(`https://api.github.com/users/${cfg.user}/repos?per_page=100&sort=pushed`, {
    headers: { 'User-Agent': 'site-projects-sync', 'Accept': 'application/vnd.github+json' }
  });
  if (!r.ok) die('GitHub API 返回 ' + r.status + (r.status === 403 ? '（匿名接口限流，稍后再试）' : ''));
  repos = (await r.json()).filter((x) => !x.fork);
} catch (e) { die('访问 GitHub 失败：' + e.message); }
log(`GitHub：取到 ${repos.length} 个非 fork 仓库（${cfg.user}）`);

const byName = new Map(repos.map((r) => [r.name, r]));
const excluded = new Set(cfg.exclude || []);
const minDescLen = (cfg.autoAppend && cfg.autoAppend.minDescLen) || 8;

const realDesc = (r) => {
  const d = (r.description || '').trim();
  if (!d || d === r.name || d.length < minDescLen) return '';
  return d;
};
const jsStr = (s) => '"' + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ').trim() + '"';
const card = (o) => `    { name: ${jsStr(o.name)}, tag: ${jsStr(o.tag)}, desc: ${jsStr(o.desc)}, link: ${jsStr(o.link)} },`;

/* ---------- 2) 组装卡片 ---------- */
const out = [];
const names = [];   // 与 out 一一对应，用来和短片快照核对
for (const c of cfg.curated || []) {
  if (!c.repo) { names.push(c.name); out.push(card({ name: c.name, tag: c.tag, desc: c.desc, link: c.link })); continue; }
  const r = byName.get(c.repo);
  if (!r) { log(`警告：GitHub 上没找到 ${c.repo}（已删除或改名？）—— 该卡片保留手写内容`); names.push(c.name || c.repo); out.push(card(c)); continue; }
  names.push(c.name || r.name);
  out.push(card({
    name: c.name || r.name,
    tag: c.tag || r.language || 'Code',
    desc: c.desc || realDesc(r) || (r.topics && r.topics.length ? '关键词：' + r.topics.slice(0, 3).join(' · ') : '（简介待补）'),
    link: r.html_url
  }));
}
const curatedRepos = new Set((cfg.curated || []).map((c) => c.repo).filter(Boolean));
let appended = 0;
if (cfg.autoAppend && cfg.autoAppend.enabled !== false) {
  const cands = repos
    .filter((r) => !curatedRepos.has(r.name) && !excluded.has(r.name) && r.name !== cfg.user && realDesc(r))
    .sort((a, b) => (b.stargazers_count - a.stargazers_count) || String(b.pushed_at).localeCompare(String(a.pushed_at)));
  for (const r of cands) {
    if (out.length >= (cfg.maxTotal || 8)) break;
    names.push(r.name);
    out.push(card({ name: r.name, tag: r.language || 'Code', desc: realDesc(r), link: r.html_url }));
    log(`自动追加：${r.name}（⭐${r.stargazers_count}，${r.language || '—'}，更新于 ${String(r.pushed_at).slice(0, 10)}）`);
    appended++;
  }
}
log(`卡片合计 ${out.length} 张（手挑 ${(cfg.curated || []).length} + 自动追加 ${appended}，上限 ${cfg.maxTotal || 8}）`);

/* ---------- 2.5) 短片快照核对 ----------
   短片是烘焙好的像素，改不了。这里只负责「提醒」：
   页面上的项目一旦和片子里的八个不一样，日志里喊一声，告诉你要重渲。 */
const snap = cfg.reel && cfg.reel.projects;
if (Array.isArray(snap) && snap.length) {
  const same = names.length === snap.length && names.every((n, i) => n === snap[i]);
  if (same) {
    log(`短片快照一致：${snap.length} 个项目（${cfg.reel.file || 'vendor/reel/'}）`);
  } else {
    log('⚠️  短片和页面已经对不上了：');
    log('   片子里：' + snap.join(' / '));
    log('   页面上：' + names.join(' / '));
    log('   → 要么重渲短片（reel/render30.mjs，改 T.projects 那 8 条），要么调 config 让顺序回到片子里那样。');
    log('   → 页面照常更新，只是别让片子和下面的作品列表各说各话。');
  }
}

/* ---------- 3) 生成新块 + 语法校验 ---------- */
const block = '  projects: [\n' + out.join('\n') + '\n  ],';
try {
  new Function('return [' + out.map((l) => l.trim().replace(/,$/, '')).join(',') + ']');
} catch (e) { die('生成的数组语法有误：' + e.message); }

const re = /[ \t]*projects: \[[\s\S]*?\n[ \t]*\],/;
const m = html.match(re);
if (!m) die('index.html 里没找到 projects 数组（页面结构变了吗？）');
if (m[0] === block) { log('数据没有变化，不写入（保持原样）'); flush(0); }

const next = html.replace(re, block);
if (!next.includes('<!doctype html>') && !next.includes('<!DOCTYPE html>')) die('产物校验失败：不是完整 HTML');
if (next.length < html.length * 0.9) die('产物校验失败：文件被截断');

/* ---------- 4) 备份 + 原子写入 ---------- */
const bkDir = cfg.backupDir || path.join(path.dirname(IDX), '.deploy-backups');
fs.mkdirSync(bkDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
fs.writeFileSync(path.join(bkDir, `index-${stamp}.html`), html);
fs.writeFileSync(IDX + '.tmp', next, 'utf8');
fs.renameSync(IDX + '.tmp', IDX);
log(`已更新 index.html：${html.length} → ${next.length} 字符（备份 ${path.basename(bkDir)}/index-${stamp}.html）`);

/* ---------- 5) 备份只留最近 N 份 ---------- */
try {
  const keep = cfg.keepBackups || 20;
  const bks = fs.readdirSync(bkDir).filter((f) => /^index-\d+\.html$/.test(f)).sort();
  for (const f of bks.slice(0, Math.max(0, bks.length - keep))) fs.unlinkSync(path.join(bkDir, f));
} catch {}

flush(0);
