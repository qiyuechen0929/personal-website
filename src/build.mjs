import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const out = [];
const rep = (m) => out.push(m);
const SITE = "D:\\个人网站";
const DEST = path.resolve(".ekko-tmp/site-test");

/* ---- 1) 注入 ---- */
rep("=== 1) inject-site.mjs ===");
const r = spawnSync(process.execPath, [".ekko-tmp/inject-site.mjs"], { encoding: "utf8" });
rep((r.stdout || "").trim());
if (r.stderr) rep("STDERR: " + r.stderr.trim());
rep("exit=" + r.status);

/* ---- 2) 刷新 ASCII 测试副本（不删目录，只覆盖文件，避免被占用） ---- */
rep("\n=== 2) 刷新测试副本 " + DEST + " ===");
fs.mkdirSync(path.join(DEST, "server"), { recursive: true });
fs.copyFileSync(path.join(SITE, "index.html"), path.join(DEST, "index.html"));
fs.copyFileSync(path.join(SITE, "server", "server.mjs"), path.join(DEST, "server", "server.mjs"));
if (!fs.existsSync(path.join(DEST, "vendor", "three.min.js"))) {
  fs.cpSync(path.join(SITE, "vendor"), path.join(DEST, "vendor"), { recursive: true });
}
rep("  index.html " + fs.statSync(path.join(DEST, "index.html")).size + "B");
rep("  server.mjs " + fs.statSync(path.join(DEST, "server", "server.mjs")).size + "B");
rep("  vendor " + fs.readdirSync(path.join(DEST, "vendor")).join(","));

/* ---- 3) 校验注入结果关键点 ---- */
rep("\n=== 3) 注入结果校验 ===");
const h = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
rep("  字符数: " + h.length);
const checks = [
  ["ChenQiyue", /ChenQiyue/g], ["26529(应为0)", /26529/g],
  ["软件工程学生", /软件工程学生/g], ["这玩意儿能不能做出来", /这玩意儿能不能做出来/g],
  ["我主要负责把它们做出来", /我主要负责把它们做出来/g],
  ["sini", /github\.com\/qiyuechen0929\/sini/g],
  ["vision-bridge", /vision-bridge/g], ["MagnetRush", /MagnetRush/g],
  ["blender-heritage-scenes", /blender-heritage-scenes/g], ["WinCleanPro", /WinCleanPro/g],
  ["邮箱 qq", /2652909926@qq\.com/g], ["邮箱 gmail", /qiyuechen114@gmail\.com/g], ["x.com", /x\.com\/chenqiyueapgm/g],
  ["visit-hero", /visit-hero/g], ["/api/hit", /\/api\/hit/g],
  ["a.card", /a\.card\{/g], ["quote", /\.quote\{/g],
  ["room-ext", /room-ext/g], ["北京时间", /北京时间/g], ["CITIES", /东京/g]
];
checks.forEach(([n, re]) => rep("  " + n + " : " + ((h.match(re) || []).length)));

/* ---- 4) 语法自检 ---- */
rep("\n=== 4) 脚本语法自检 ===");
for (const p of ["site.js", "site2.js", "site3.js", "visitor.js", "site5.js", "site6.js"]) {
  const tmp = path.resolve(".ekko-tmp/_syn.js");
  fs.writeFileSync(tmp, fs.readFileSync(".ekko-tmp/site-parts/" + p, "utf8"), "utf8");
  const c = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
  rep("  " + p + " -> " + (c.status === 0 ? "OK" : "ERR " + (c.stderr || "").split("\n").slice(0, 5).join(" / ")));
  fs.rmSync(tmp, { force: true });
}

fs.writeFileSync(".ekko-tmp/build-out.txt", out.join("\n"), "utf8");
console.log("build report written, lines=" + out.length);
