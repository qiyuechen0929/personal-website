import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import os from "os";

const DIR = "D:\\个人网站";
const FILE = path.join(DIR, "index.html");
const P = ".ekko-tmp/site-parts/";

// ---- 从最新原始备份重新注入（可重复执行，不叠加） ----
const backups = fs.readdirSync(DIR)
  .filter((f) => /^index\.backup-\d{8}-\d{6}\.html$/.test(f)).sort();
if (!backups.length) { console.error("没有找到原始备份，中止"); process.exit(1); }
const BACKUP = path.join(DIR, backups[backups.length - 1]);
let t = fs.readFileSync(BACKUP, "utf8");
const before = t.length;
console.log("源文件（原始备份）: " + path.basename(BACKUP));

/* ==================================================================
   一、站点身份 / 联系方式 / 个人简介 / 作品（声明式，改这里即可）
   ================================================================== */
const ID = {
  name: "ChenQiyue",
  github: "https://github.com/qiyuechen0929",
  x: "https://x.com/chenqiyueapgm",
  telegram: "https://t.me/ChenQiyue0929",
  mails: [
    { label: "QQ 邮箱", addr: "2652909926@qq.com" },
    { label: "Gmail", addr: "qiyuechen114@gmail.com" }
  ]
};

// 1) 全局改名
const nameHits = (t.match(/26529/g) || []).length;
t = t.split("26529").join(ID.name);
console.log(`ok  名字 26529 → ${ID.name}（${nameHits} 处）`);

// 2) 社交链接
const socRe = /[ \t]*socials: \[[\s\S]*?\n[ \t]*\],/;
if (!socRe.test(t)) { console.error("FAIL 定位 socials"); process.exit(1); }
t = t.replace(socRe, `  socials: [
    { name: "GitHub", url: "${ID.github}", note: "代码都在这" },
` + ID.mails.map((m) => `    { name: "${m.label}", url: "mailto:${m.addr}", note: "${m.addr}" },`).join("\n")
  + `
    { name: "X / 推特", url: "${ID.x}", note: "@chenqiyueapgm" },
    { name: "Telegram", url: "${ID.telegram}", note: "@ChenQiyue0929" }
  ],`);
console.log("ok  socials → GitHub / QQ邮箱 / Gmail / X");

// 3) 个人简介（2D 关于区 + 3D 相框面板共用这一份）
const aboutRe = /[ \t]*about: \{[\s\S]*?\n[ \t]*\},/;
if (!aboutRe.test(t)) { console.error("FAIL 定位 about"); process.exit(1); }
t = t.replace(aboutRe, `  about: {
    lead: "我是 <strong>ChenQiyue</strong>，一名软件工程学生。平时比较喜欢折腾 AI、开源、Web 和各种新鲜技术。",
    bio: "看到一个有意思的想法，我的第一反应通常不是「有没有必要」，而是 —— <strong>「这玩意儿能不能做出来？」</strong> 我不太喜欢只停留在「听说过」「研究过」，比起看教程，更想直接上手把东西跑起来，在不断踩坑的过程中搞明白它到底怎么回事。折腾的结果并不总是成功：有些变成了能跑的东西，有些变成了一堆代码，还有一些只证明了「这个想法确实不太行」——但我觉得这也挺有意思。",
    facts: [
      { k: "现在", v: "软件工程学生" },
      { k: "坐标", v: "中国 · 东莞" },
      { k: "正在折腾", v: "AI · Agent · 开源 · Web · 3D" },
      { k: "一句话", v: "喜欢折腾，偶尔整活，认真做东西" }
    ],
    chips: ["AI", "Agent", "开源", "Web", "3D", "生成式内容", "自动化"]
  },`);
console.log("ok  about → 个人简介已写入");

// 4) 作品（真实 GitHub 仓库）
const projRe = /[ \t]*projects: \[[\s\S]*?\n[ \t]*\],/;
if (!projRe.test(t)) { console.error("FAIL 定位 projects"); process.exit(1); }
const PROJ = [
  { name: "似你 · Sini", tag: "Flutter", desc: "端侧优先的 AI 数字人格聊天 App：用聊天记录克隆 TA 的说话方式，语音克隆也在本地跑。", link: ID.github + "/sini" },
  { name: "vision-bridge", tag: "PowerShell", desc: "给纯文本模型「装眼睛」：把剪贴板/截图自动交给视觉模型转成文字，再交回你的 AI。", link: ID.github + "/vision-bridge" },
  { name: "MagnetRush", tag: "HTML5", desc: "纯 Canvas 写的赛车躲避小游戏：视觉特效、语音助手、技能系统、车库改装。", link: ID.github + "/MagnetRush" },
  { name: "古建场景生成", tag: "Python", desc: "AI 实时建模的低多边形中国古建场景：北京天坛 & 佛山祖庙，含昼夜与巡游视频。", link: ID.github + "/blender-heritage-scenes" },
  { name: "WinCleanPro", tag: "PowerShell", desc: "轻量 Windows 清理工具：一次把系统垃圾扫干净，界面也是自己画的。", link: ID.github + "/WinCleanPro" },
  { name: "这间书房", tag: "WebGL", desc: "你现在站着的地方。Three.js 手搓、零素材纯代码 —— 门后面就是它。", link: ID.github }
];
t = t.replace(projRe, `  projects: [
` + PROJ.map((p) => `    { name: "${p.name}", tag: "${p.tag}", desc: "${p.desc}", link: "${p.link}" },`).join("\n") + `
  ],`);
console.log("ok  projects → 6 个真实 GitHub 项目");

// 5) 访客计数接口配置
// 给 3D 面板加一个 "AI 思考"（不放长文，只给链接）
if (t.includes("const PANELS={") && !t.includes("thinking:{")) {
  t = t.replace("const PANELS={", "const PANELS={\n  thinking:{\n    title:\"AI 思考\", sub:\"桌上那张手稿\", ico:ICONS.about,\n    html(){\n      return '<p class=\"p-lead\">关于未来 AI 发展的一点想法，我写在 X 上；正文比较长，就不搬进屋里了。</p>'\n        + '<a class=\"proj\" href=\"https://x.com/chenqiyueapgm/status/2103454717993238566\" target=\"_blank\" rel=\"noopener\">'\n        + '<b>去 X 读全文<i>@chenqiyueapgm</i></b><p>在 X（推特）里打开这条推文</p></a>';\n    }\n  },");
  console.log("ok  3D 面板新增 thinking");
}
const footAnchor = `  footer: "用好奇心供电"`;
if (!t.includes(footAnchor)) { console.error("FAIL 定位 footer 配置"); process.exit(1); }
t = t.replace(footAnchor, `  visitor: {
    /* 访客计数接口：留空 = 本机计数兜底
       同域部署（server/server.mjs 同时托管本站）→ "/api/hit"
       网站放别处、只有计数在服务器 → "https://你的地址/api/hit" */
    api: "/api/hit",
    localBase: 0
  },
` + footAnchor);
console.log("ok  CONFIG.visitor 已加入");

/* ==================================================================
   二、注入 2D 门厅 + 3D 扩展 + 访客组件
   ================================================================== */
const read = (f) => fs.existsSync(P + f) ? fs.readFileSync(P + f, "utf8") : "";
const css = read("site.css"), css2 = read("site2.css"), cssV = read("visitor.css"), css5 = read("site5.css");
const html = read("site.html"), html2 = read("site2.html");
const js = read("site.js"), js2 = read("site2.js"), js3 = read("site3.js"), jsV = read("visitor.js"), js5 = read("site5.js"), js6 = read("site6.js");

const EXTRA_CSS = `
/* ================= 窄屏加固（Ekko 追加） ================= */
@media (max-width:760px){
  .wrap{padding:0 18px;}
  .sec{padding:64px 0;}
}
@media (hover:none){
  html{-webkit-text-size-adjust:100%;}
  body{-webkit-tap-highlight-color:transparent;}
  .tbtn{min-width:40px; min-height:40px;}
  .socials{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));}
}
@media (max-width:430px){
  .wrap{padding:0 15px;}
  #site-top{padding:10px 12px; gap:8px;}
  #site-top .sb{padding:7px 11px; gap:7px;}
  #site-top .sb b{font-size:12.5px;}
  #site-top .sb small{display:none;}
  .tbtn{width:38px; height:38px;}
  #hero h1{font-size:clamp(25px, 8.6vw, 33px);}
  #hero .lede{font-size:14.5px; line-height:1.75;}
  .sec-head h2{font-size:22px;}
  .about-grid{gap:24px;}
  .quote{font-size:14px; padding:13px 16px;}
  .tweet{padding:18px 16px 16px;}
  .tweet h3{font-size:17px;}
  .cards{grid-template-columns:1fr;}
  /* 3D 房间顶栏：按钮多，缩一缩别挤爆 */
  #topbar{padding:10px 12px;}
  #topbar button, #tools button{width:34px; height:34px;}
  #brand small{display:none;}
  #hint{font-size:11.5px; max-width:92vw;}
}
@supports (height:100svh){
  @media (max-width:760px){ #hero{min-height:100svh;} }
}

/* 转场时的舞台与层级（脚本追加） */
body.warp #stage{opacity:1;}
body.warp #topbar,body.warp #dots{opacity:0;}
body.mode-space #light,body.mode-space #trail,body.mode-space #pet,body.mode-space #vignette{display:none;}
/* 写在 X 上的思考（推文卡） */
.tweet{display:block; text-decoration:none; color:inherit; margin-top:6px; padding:22px 24px 18px;
  border-radius:18px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.035);
  backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  transition:transform .35s cubic-bezier(.2,.9,.3,1), border-color .35s, background .35s;}
.tweet:hover{transform:translateY(-4px); border-color:rgba(240,163,94,.45); background:rgba(255,255,255,.06);}
[data-theme="light"] .tweet{background:rgba(0,0,0,.025); border-color:rgba(0,0,0,.08);}
.tw-head{display:flex; align-items:center; gap:12px; margin-bottom:14px;}
.tw-logo{width:34px; height:34px; flex:none; border-radius:11px; display:grid; place-items:center; background:#0f1419; color:#fff;}
.tw-logo svg{width:17px; height:17px; fill:currentColor;}
.tw-head b{display:block; font-size:14px;}
.tw-head small{font-size:12px; color:var(--muted);}
.tw-go{margin-left:auto; font-size:12.5px; color:#f0a35e; white-space:nowrap;}
.tweet h3{margin:2px 0 8px; font-size:19px; letter-spacing:.2px;}
.tweet p{margin:0; font-size:14px; line-height:1.8; color:var(--muted);}
.tw-foot{margin-top:16px; padding-top:13px; border-top:1px solid rgba(255,255,255,.08); display:flex; gap:10px; font-size:12px; color:var(--muted);}
[data-theme="light"] .tw-foot{border-color:rgba(0,0,0,.07);}
@media (max-width:760px){ .tw-go{display:none;} .tweet{padding:18px;} }
/* 作品卡片整块可点（跳 GitHub） */
a.card{text-decoration:none; color:inherit; display:block;}
.cards{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));}
.more-projects{margin-top:22px; font-size:13.5px; color:var(--muted); text-align:center;}
.more-projects a{color:var(--ink,inherit); text-decoration:none; border-bottom:1px solid rgba(240,163,94,.5); padding-bottom:2px;}
.more-projects a:hover{color:#f0a35e;}
.quote{margin-top:24px; padding:15px 20px; border-left:2px solid #f0a35e; border-radius:0 14px 14px 0;
  background:linear-gradient(90deg, rgba(240,163,94,.10), rgba(240,163,94,0));
  font-size:15px; line-height:1.85; letter-spacing:.2px;}
.quote b{font-weight:700;}
[data-theme="light"] .quote{background:linear-gradient(90deg, rgba(224,138,60,.12), rgba(224,138,60,0));}
`;

const log = [];
function must(cond, msg) { if (!cond) { console.error("FAIL: " + msg); process.exit(1); } log.push("ok  " + msg); }

must(t.includes("</style>"), "定位 </style>");
t = t.replace("</style>", css + "\n" + css2 + "\n" + cssV + "\n" + css5 + EXTRA_CSS + "\n</style>");

must(t.includes("<body>"), "定位 <body>");
t = t.replace("<body>", "<body>\n" + html + "\n" + html2 + "\n");

must(t.includes('<div id="gate">'), "定位 #gate");
t = t.replace('<div id="gate">', '<div id="gate" class="bye">');

const probe = "/* 测试探针用 */";
must(t.includes(probe), "定位测试探针锚点");
t = t.replace(probe, js + "\n" + js2 + "\n" + js3 + "\n" + jsV + "\n" + js5 + "\n" + js6 + "\n" + probe);

// ---- 暴露 3D 内部引用给扩展包 ----
const oldProbeExport = "window.__room={openPanel,toggleDay,toggleLamp,toggleMusic,interact,applyDayNight,get cam(){return cam;}};";
const newProbeExport = oldProbeExport
  .replace("applyDayNight,get cam(){return cam;}}", "applyDayNight,get cam(){return cam;},camera,\n  Audio8,tween,easeOut,easeIO,lerp,V3,flyTo,toast,\n  get room(){return room;},\n  get scene(){try{let o=interact[0].objects[0];while(o.parent)o=o.parent;return o;}catch(e){return null;}}}");
must(t.includes(oldProbeExport), "定位 window.__room 探针");
t = t.replace(oldProbeExport, newProbeExport);
log.push("ok  暴露 Audio8 / scene / room / flyTo / toast 给扩展包");

// ---- 替换 boot() ----
const bootStart = t.indexOf("function boot(){");
must(bootStart > 0, "定位 function boot(){");
let i = t.indexOf("{", bootStart), depth = 0, end = -1;
for (; i < t.length; i++) {
  const ch = t[i];
  if (ch === "{") depth++;
  else if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
}
must(end > 0, "boot() 括号匹配");
const newBoot = `function boot(){
  // 2D 门厅是默认落地页；3D 空间在做完首屏后预热，保证进门瞬间就绪
  const warm=()=>{ try{ if(window.__site) window.__site.ensureRoom(); }catch(e){} };
  if("requestIdleCallback" in window) requestIdleCallback(warm,{timeout:2500});
  else setTimeout(warm,2200);
  addEventListener("pointerdown",warm,{once:true});
}`;
t = t.slice(0, bootStart) + newBoot + t.slice(end);
log.push("ok  替换 boot()");

// ---- 门厅模式下不渲染 3D（省电）----
const animStart = t.indexOf("function animate(){");
must(animStart > 0, "定位 function animate(){");
const afterBrace = animStart + "function animate(){".length;
const guard = `
  if(window.__site&&window.__site.mode==="site"&&window.__site.ready&&!window.__site.busy){ requestAnimationFrame(animate); return; }`;
t = t.slice(0, afterBrace) + guard + t.slice(afterBrace);
log.push("ok  animate() 门厅守卫");

/* ---- 最终产物自检：把内联 <script> 全抽出来，确认没有语法错误（会挡住一类致命低级错误） ---- */
try {
  const re = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m, n = 0, bad = 0;
  while ((m = re.exec(t))) {
    n++;
    const tmp = path.join(os.tmpdir(), "_ekko_check_" + n + ".js");
    fs.writeFileSync(tmp, m[1], "utf8");
    const c = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
    if (c.status !== 0) { bad++; console.error("内联脚本 #" + n + " 语法错误: " + (c.stderr || "").split("\n").slice(0, 4).join(" / ")); }
    else log.push("ok  最终产物自检：内联脚本 #" + n + " 语法 OK");
    fs.rmSync(tmp, { force: true });
  }
  if (bad) { console.error("最终产物有 " + bad + " 个脚本语法错误，未写入！"); process.exit(1); }
} catch (e) { console.error("自检异常（忽略）: " + e.message); }

fs.writeFileSync(FILE, t, "utf8");
console.log(log.join("\n"));
console.log("index.html: " + before + " → " + t.length + " 字符（+" + (t.length - before) + "）");
