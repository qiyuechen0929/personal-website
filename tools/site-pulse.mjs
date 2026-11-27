// 每日站点健康巡检 & GitHub 活跃快照（生成 docs/status/daily-pulse.json 与 docs/status/PULSE.md）
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('docs/status');
const JSON_FILE = path.join(OUT_DIR, 'daily-pulse.json');
const MD_FILE = path.join(OUT_DIR, 'PULSE.md');

const TARGETS = [
  { name: '个人网站 · 书房', url: 'https://chenqiyue.ccwu.cc/' },
  { name: '便签墙 API',     url: 'https://chenqiyue.ccwu.cc/api/notes?limit=1' },
  { name: '复古桌面博客',   url: 'https://060929.xyz/' }
];

async function probe(url) {
  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10000);
  try {
    const res = await fetch(url, { method: 'GET', signal: ac.signal, redirect: 'follow' });
    return { ok: res.ok, status: res.status, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, err: e.name || 'ERR' };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGithubStats(user) {
  try {
    const headers = { 'User-Agent': 'site-pulse-bot', 'Accept': 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=100&type=owner`, { headers });
    if (!res.ok) return null;
    const repos = await res.json();
    const own = repos.filter((r) => !r.fork);
    const stars = own.reduce((s, r) => s + (r.stargazers_count || 0), 0);
    return { repos: own.length, stars };
  } catch {
    return null;
  }
}

function beijingDate() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toISOString().slice(0, 19).replace('T', ' ') + ' +08:00'
  };
}

const now = beijingDate();
const checks = [];
for (const t of TARGETS) {
  const r = await probe(t.url);
  checks.push({ name: t.name, url: t.url, ...r });
}
const gh = await fetchGithubStats('qiyuechen0929');

fs.mkdirSync(OUT_DIR, { recursive: true });
let history = [];
if (fs.existsSync(JSON_FILE)) {
  try { history = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8')).history || []; } catch {}
}

const entry = {
  date: now.date,
  checkedAt: now.time,
  github: gh,
  checks: checks.map(({ name, ok, status, ms }) => ({ name, ok, status, ms }))
};

// 同一天覆盖更新，保留最近 90 天
history = [entry, ...history.filter((x) => x.date !== now.date)].slice(0, 90);

fs.writeFileSync(JSON_FILE, JSON.stringify({ updatedAt: now.time, history }, null, 2) + '\n', 'utf8');

const lines = [
  '# 站点每日运行脉搏（Daily Site Pulse）',
  '',
  `> 最近巡检：\`${now.time}\`${gh ? ` · GitHub 原创仓库 **${gh.repos}** 个 · 累计 Star **${gh.stars}**` : ''}`,
  '',
  '| 站点 / 接口 | 状态 | 耗时 |',
  '|---|---|---|',
  ...checks.map((c) => `| [${c.name}](${c.url}) | ${c.ok ? `✅ ${c.status}` : `⚠️ ${c.status || c.err}`} | ${c.ms} ms |`),
  '',
  '## 最近记录（保留 90 天）',
  '',
  '| 日期 | 个人网站 | 便签墙 API | 博客 | 仓库 / Star |',
  '|---|---|---|---|---|',
  ...history.slice(0, 30).map((h) => {
    const fmt = (idx) => {
      const c = h.checks[idx];
      if (!c) return '-';
      return c.ok ? `✅ ${c.ms}ms` : `⚠️ ${c.status || 'ERR'}`;
    };
    const g = h.github ? `${h.github.repos} / ⭐${h.github.stars}` : '-';
    return `| ${h.date} | ${fmt(0)} | ${fmt(1)} | ${fmt(2)} | ${g} |`;
  }),
  ''
];

fs.writeFileSync(MD_FILE, lines.join('\n'), 'utf8');
console.log('Daily pulse updated:', now.time, checks.map((c) => `${c.name}=${c.status}(${c.ms}ms)`).join(', '));
